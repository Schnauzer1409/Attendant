import React, { useEffect, useRef, useState } from 'react';
import { localService } from '../services/localService';
import { commonService } from '../services/commonService';
import { useNavigate } from 'react-router-dom';

export default function StudentPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [msg, setMsg] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const username = localService.get("username") || "Sinh viên";

    useEffect(() => {
        startCamera();
        return () => stopCamera(); // Cleanup camera khi rời trang
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error(err)
            alert("Không bật được camera. Hãy kiểm tra quyền camera!");
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
    };

    const handleLogout = () => {
        commonService.logout()
        navigate('/');
    };

    const captureAttendance = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
            setMsg("Camera chưa sẵn sàng");
            return;
        }

        setLoading(true);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg"));
        if (!blob) {
            setMsg("Không tạo được ảnh");
            setLoading(false);
            return;
        }

        const form = new FormData();
        form.append("username", localStorage.getItem("username") || "");
        form.append("file", blob, "face.jpg");

        try {
            const res = await fetch("/api/attendance", { method: "POST", body: form });
            const data = await res.json();
            setMsg(data.msg || data.status);
        } catch (e) {
            console.error(e)
            setMsg("Lỗi kết nối server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#eef2f3] flex flex-col items-center py-[60px] font-[Arial]">
            <div className="bg-white p-[25px] rounded-[12px] w-[350px] shadow-[0_0_15px_rgba(0,0,0,0.1)] text-center">
                <h2 className="text-[1.5em] font-bold mb-4">Điểm danh khuôn mặt</h2>

                <button onClick={handleLogout} className="bg-[#dc3545] text-white px-[20px] py-[10px] rounded-[6px] mb-4 hover:opacity-90">
                    Đăng xuất
                </button>

                <div className="text-[22px] font-bold my-[10px] text-red-600 uppercase">
                    {username}
                </div>

                <video ref={videoRef} autoPlay playsInline className="w-full rounded-[10px] mt-[15px] bg-black" />
                <canvas ref={canvasRef} className="hidden" />

                <button
                    onClick={captureAttendance}
                    disabled={loading}
                    className="w-full bg-[#007bff] text-white px-[20px] py-[10px] rounded-[6px] mt-[10px] font-bold hover:bg-[#0056b3] disabled:bg-gray-400"
                >
                    {loading ? "Đang xử lý..." : "Chụp điểm danh"}
                </button>

                <p className="mt-[10px] text-red-600 font-medium min-h-[24px]">{msg}</p>
            </div>
        </div>
    );
};