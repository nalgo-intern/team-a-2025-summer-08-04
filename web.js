const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
canvas.onmousedown = () => drawing = true;
canvas.onmouseup = () => drawing = false;
canvas.onmousemove = e => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.lineWidth = 20;         // 太さを調整
 ctx.lineJoin = "round";     // 線のつなぎ目を丸く
 ctx.lineCap = "round";      // 線の先端を丸く
  ctx.arc(e.clientX - rect.left, e.clientY - rect.top, 10, 0, Math.PI * 2);
  ctx.fillStyle = "black";
  ctx.fill();
};

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function predict() {
  const base64 = canvas.toDataURL("image/png");
  const res = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 })
  });
  const data = await res.json();
  document.getElementById("result").textContent = "Result: " + data.result;
}