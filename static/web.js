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
  // Step 1: 描画Canvasの内容を一時Canvasへコピー
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, 0, 0);

  // Step 2: 中央線の領域をクリア（線を除去）
  const centerX = canvas.width / 2;
  tempCtx.clearRect(centerX - 1, 0, 3, canvas.height);

  // Step 3: 28×28に縮小（中間キャンバス）
  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = 28;
  smallCanvas.height = 28;
  const smallCtx = smallCanvas.getContext("2d");
  smallCtx.fillStyle = "white";
  smallCtx.fillRect(0, 0, 28, 28);
  smallCtx.drawImage(tempCanvas, 0, 0, 28, 28);

  // Step 4: 白黒反転（黒背景・白文字）
  const imageData = smallCtx.getImageData(0, 0, 28, 28);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // R, G, Bを255 - 値 にして反転
    data[i] = 255 - data[i];     // R
    data[i + 1] = 255 - data[i + 1]; // G
    data[i + 2] = 255 - data[i + 2]; // B
    // alpha値（data[i + 3]）はそのまま
  }
  smallCtx.putImageData(imageData, 0, 0);

  // 表示用に確認（任意）
  const finalBase64 = smallCanvas.toDataURL("image/png");

  // Step 5: 空白チェック（反転後の画像と白画像比較）
  const blankCanvas = document.createElement("canvas");
  blankCanvas.width = 28;
  blankCanvas.height = 28;
  const blankCtx = blankCanvas.getContext("2d");
  blankCtx.fillStyle = "black"; // 背景を黒にして比較（反転後と同条件）
  blankCtx.fillRect(0, 0, 28, 28);
  const blankBase64 = blankCanvas.toDataURL("image/png");

  if (finalBase64 === blankBase64) {
    document.getElementById("result").textContent = "Result: 何も書かれていません";
    return;
  }

  document.getElementById("result").textContent = "読み込み中...";

  // Step 6: AIに送信
  try {
    const res = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: finalBase64 })
    });

    const data = await res.json();

    if (data.confidence < 0.8) {
      document.getElementById("result").textContent = "Result: 自信がありません。もう一度お願いします。";
    } else {
      document.getElementById("result").textContent =
        "Result: " + data.result + "（信頼度: " + Math.round(data.confidence * 100) + "%）";
    }

  } catch (err) {
    document.getElementById("result").textContent = "Result: 認識に失敗しました。もう一度入力してください。";
    console.error(err);
  }
}
