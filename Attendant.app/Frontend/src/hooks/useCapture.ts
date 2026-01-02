import { useCallback, useRef, useState } from "react";

export function useCapture() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const streamRef = useRef<MediaStream | null>(null);

    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const stopCamera = useCallback(() => {
        // Ưu tiên tắt từ streamRef (nơi lưu trữ chính xác nhất)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Cleanup cả trên thẻ video để chắc chắn
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        
        setError('');
        setLoading(false);
    }, []);

    const startCamera = useCallback(async () => {
        // Stop stream cũ nếu đang chạy để tránh bật 2 lần
        stopCamera();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });

            // 👇 QUAN TRỌNG: Lưu stream ngay lập tức vào ref quản lý
            streamRef.current = stream;

            // Nếu lúc này component đã unmount (videoRef mất), ta tắt stream ngay
            if (!videoRef.current) {
                stopCamera(); 
                return;
            }

            // Gán vào video để hiển thị
            videoRef.current.srcObject = stream;

        } catch (err) {
            console.error(err);
            setError("Không bật được camera. Hãy kiểm tra quyền camera!");
        }
    }, [stopCamera]);

    const handleCapture = useCallback(async (): Promise<Blob | undefined> => {
        if (loading) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || !streamRef.current || video.readyState < 2) {
            setError("Camera chưa sẵn sàng");
            return;
        }

        setLoading(true);
        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(video, 0, 0);

            const blob = await new Promise<Blob | null>(resolve => 
                canvas.toBlob(resolve, "image/jpeg", 0.9)
            );

            if (!blob) {
                setError("Không tạo được ảnh");
                return;
            }
            return blob;
        } catch (e) {
            setError("Lỗi khi chụp ảnh");
        } finally {
            setLoading(false);
        }
    }, [loading]);

    return {
        videoRef,
        canvasRef,
        captureError: error,
        isCapturing: loading,
        startCamera,
        stopCamera,
        handleCapture
    }
}