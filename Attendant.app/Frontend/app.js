// =====================================================
// HÀM CHUYỂN BLOB → BASE64 (nếu cần dùng trong tương lai)
// =====================================================
function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // Khi đọc xong → trả base64
        reader.readAsDataURL(blob); // Đọc blob thành DataURL
    });
}


// =====================================================
// KIỂM TRA TOKEN KHI VÀO TRANG (BẢO VỆ ROUTE)
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // Nếu chưa đăng nhập → quay về trang login
    if (!token) {
        window.location.href = "/static/index.html";
        return;
    }

    // Tránh truy cập nhầm trang
    if (role === "teacher" && location.pathname.includes("student")) {
        window.location.href = "/static/teacher.html";
    }
    if (role === "student" && location.pathname.includes("teacher")) {
        window.location.href = "/static/student.html";
    }
     
});


// =====================================================
// ĐĂNG XUẤT
// =====================================================
function logout() {
    localStorage.clear(); // Xóa token + thông tin user
    window.location.href = "/static/index.html";
}


// =====================================================
// GIÁO VIÊN — XÓA TẤT CẢ DỮ LIỆU KHUÔN MẶT
// =====================================================
async function clearEncodings() {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu khuôn mặt không?")) return;

    let res = await fetch("/api/clear_encodings");
    let data = await res.json();

    alert(data.msg);
}


// =====================================================
// BẬT CAMERA (DÙNG CHO STUDENT + TEACHER)
// =====================================================
let cameraStream = null;

async function startCamera() {
    if (cameraStream) return; // ĐÃ MỞ → KHÔNG MỞ LẠI

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        });

        // STUDENT
        const videoStudent = document.getElementById("video");

        // TEACHER
        const videoEnroll = document.getElementById("videoEnroll");
        const videoWM = document.getElementById("videoWM");

        if (videoStudent) {
            videoStudent.srcObject = cameraStream;
            videoStudent.play();
        }

        if (videoEnroll) {
            videoEnroll.srcObject = cameraStream;
            videoEnroll.play();
        }

        if (videoWM) {
            videoWM.srcObject = cameraStream;
            videoWM.play();
        }

        console.log("📷 Camera dùng chung đã bật");

    } catch (err) {
        console.error("❌ Không bật được camera:", err);
        alert("Không bật được camera. Hãy kiểm tra quyền camera!");
    }
}



// =====================================================
// SINH VIÊN — CHỤP ẢNH ĐIỂM DANH
// =====================================================
async function captureAttendance() {
    const video = document.getElementById("video");
    const username = localStorage.getItem("username");
    const canvas = document.getElementById("canvas");
    const msg = document.getElementById("msg");

    // Camera chưa load xong
    if (!video || video.readyState < 2) {
        msg.innerText = "Camera chưa sẵn sàng";
        return;
    }

    // Set kích thước canvas = video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Vẽ frame từ video lên canvas
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Chuyển canvas → blob JPG
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
    if (!blob) {
        msg.innerText = "Không tạo được ảnh";
        return;
    }

    // Gửi file lên backend
    const form = new FormData();
    form.append("username", username);
    form.append("file", blob, "face.jpg"); // Quan trọng: gửi file chứ không base64

    try {
        const res = await fetch("/api/attendance", {
            method: "POST",
            body: form
        });

        const data = await res.json();

        msg.innerText = data.msg || data.status;

    } catch (e) {
        console.error("Fetch error:", e);
        msg.innerText = "Lỗi kết nối server";
    }
}
// =====================================================
// GIÁO VIÊN — CHỤP ẢNH TỪ CAMERA & ENROLL
// =====================================================
async function captureEnroll() {
   const video = document.getElementById("videoEnroll");
    const canvas = document.getElementById("canvas");
    const msg = document.getElementById("msg");
    const studentId = document.getElementById("studentId").value.trim();

    if (!studentId) {
        msg.innerText = "Vui lòng nhập MSSV";
        return;
    }

    if (!video || video.readyState < 2) {
        msg.innerText = "Camera chưa sẵn sàng";
        return;
    }

    // Set canvas đúng kích thước video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Canvas → Blob JPG
    const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
    );

    if (!blob) {
        msg.innerText = "Không chụp được ảnh";
        return;
    }

    // Gửi lên backend
    const form = new FormData();
    form.append("username", studentId);
    form.append("file", blob, "enroll.jpg");

    try {
        const res = await fetch("/api/enroll", {
            method: "POST",
            body: form
        });

        const data = await res.json();

        msg.innerText = data.msg || data.status;

    } catch (err) {
        console.error(err);
        msg.innerText = "Lỗi kết nối server";
    }
}



// =====================================================
// GIÁO VIÊN — UPLOAD WATERMARK (ẢNH ĐỒ VẬT TRONG PHÒNG)
// =====================================================
async function uploadWatermark() {
    const fileInput = document.getElementById("wmInput");
    const file = fileInput.files[0];

    let form = new FormData();
    form.append("file", file);

    // Gửi ảnh watermark gốc
    let res = await fetch("/api/upload_watermark", {
        method: "POST",
        body: form
    });

    let data = await res.json();
    document.getElementById("wmMsg").innerText = data.msg;

    // Sau khi upload → chuyển qua bước cắt ảnh
    generateWatermarkPart(file);
}


// =====================================================
// GIÁO VIÊN — TẠO HÌNH WATERMARK NHẤN MẠNH (CẮT VÙNG)
// =====================================================
async function generateWatermarkPart(file) {
    let form = new FormData();
    form.append("file", file);

    // Backend cắt ảnh watermark → trả về base64
    let res = await fetch("/api/teacher_generate_watermark", {
        method: "POST",
        body: form
    });

    let data = await res.json();

    // Hiển thị ảnh cắt để giáo viên xác nhận
    document.getElementById("wmMsg").innerHTML =
        `<img src="data:image/jpeg;base64,${data.watermark}" width="150"> 
         <br>Ấn 'Set watermark' để xác nhận`;

    // Hiện nút confirm
    document.getElementById("btnSetWM").style.display = "inline-block";
}


// =====================================================
// GIÁO VIÊN — XÁC NHẬN WATERMARK CUỐI CÙNG
// =====================================================
async function setWatermark() {
    let res = await fetch("/api/set_watermark", {
        method: "POST"
    });

    let data = await res.json();

    if (data.status === "ok") {

        // Ẩn nút set watermark
        document.getElementById("btnSetWM").style.display = "none";

        // Thêm thông báo thành công
        document.getElementById("wmMsg").innerHTML +=
            `<br><span style="color: green; font-weight: bold;">
                ✓ Đã xác nhận watermark thành công
            </span>`;
    }
    else {
        alert("Lỗi khi set watermark");
    }
}
// =====================================================
// GIÁO VIÊN — CHỤP ẢNH WATERMARK TỪ CAMERA
// =====================================================
async function captureWatermarkFromCamera() {
    const video = document.getElementById("videoWM");
    if (!video || video.readyState < 2) {
        alert("Camera chưa sẵn sàng");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
    );

    if (!blob) {
        alert("Không chụp được ảnh");
        return;
    }

    // ⚠️ TẠO FILE GIẢ → GIỐNG UPLOAD FILE
    const file = new File([blob], "watermark.jpg", { type: "image/jpeg" });

    // 1️⃣ Upload ảnh
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload_watermark", {
        method: "POST",
        body: form
    });

    const data = await res.json();
    document.getElementById("wmMsg").innerText = data.msg;

    // 2️⃣ GỌI TIẾP BƯỚC CẮT WATERMARK
    await generateWatermarkPart(file);
}


function enableCamera() {
    startCamera();
    document.getElementById("cameraOverlay").style.display = "none";
}
