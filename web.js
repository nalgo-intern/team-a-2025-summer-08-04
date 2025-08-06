// script.js
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let lastX, lastY;

canvas.onmousedown = e => {
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
};

canvas.onmouseup = () => drawing = false;

canvas.onmousemove = e => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const gradient = ctx.createRadialGradient(x, y, 1, x, y, 10);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
};

function drawCenterLine() {
  const centerX = canvas.width / 2;
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, canvas.height);
  ctx.strokeStyle = "gray";
  ctx.lineWidth = 2;
  ctx.stroke();
}

window.onload = () => {
  clearCanvas();
};

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCenterLine(); // 再描画
  document.getElementById("result").textContent = "Result: ?";
}


function isCanvasBlankExceptLine(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const centerX = Math.floor(canvas.width / 2);
  const pixels = imageData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      const isWhite = r === 255 && g === 255 && b === 255 && a === 255;
      const isCenterLine = (x === centerX || x === centerX - 1 || x === centerX + 1) && r === 128 && g === 128 && b === 128;

      if (!isWhite && !isCenterLine) {
        return false; // 描かれている
      }
    }
  }
  return true; // 縦線以外は空白
}

async function predict() {
  const base64 = canvas.toDataURL("image/png");

  // キャンバスの内容を取得
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let hasDrawing = false;
  const centerX = canvas.width / 2;
  const margin = 2; // 縦線の幅より広めに除外（例えば2px）

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      // 縦線部分を無視
      if (x >= centerX - margin && x <= centerX + margin) continue;

      const index = (y * canvas.width + x) * 4;
      const alpha = imageData[index + 3];

      if (alpha !== 0) {
        hasDrawing = true;
        break;
      }
    }
    if (hasDrawing) break;
  }

  if (!hasDrawing) {
    document.getElementById("result").textContent = "Result: 何も書かれていません";
    return;
  }

  // 読み込み中表示
  document.getElementById("result").textContent = "読み込み中...";

  // プレビュー表示（任意）
  document.getElementById("preview").src = base64;

  try {
    const res = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 })
    });

    if (!res.ok) throw new Error("Fetch error");

    const data = await res.json();

    if (data.confidence < 0.8) {
      document.getElementById("result").textContent = "Result: 自信がありません。もう一度お願いします。";
    } else {
      document.getElementById("result").textContent = "Result: " + data.result + "（信頼度: " + Math.round(data.confidence * 100) + "%）";
    }

  } catch (err) {
    document.getElementById("result").textContent = "Result: 認識に失敗しました。もう一度入力してください。";
    console.error(err);
  }
}
