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

function getDrawnSideWithThreshold(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const centerX = canvas.width / 2;

  let leftPixels = 0;
  let rightPixels = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];
      if (alpha > 0) {
        if (x < centerX) leftPixels++;
        else rightPixels++;
      }
    }
  }

  const totalPixels = leftPixels + rightPixels;
  if (totalPixels === 0) return "none";

  const leftRatio = leftPixels / totalPixels;
  const rightRatio = rightPixels / totalPixels;

  const threshold = 0.9; // ピクセルの90%以上が片側にあればその側と判断

  if (leftRatio > threshold) return "left";
  if (rightRatio > threshold) return "right";

  return "both";
}

// 修正された extractRegion 関数
function extractRegion(canvas, side) {
  const originalWidth = canvas.width;
  const originalHeight = canvas.height;
  const halfWidth = originalWidth / 2;
  const centerX = originalWidth / 2;
  
  // 1. 文字のピクセルのみを抽出するための新しいキャンバス
  const textCanvas = document.createElement("canvas");
  textCanvas.width = originalWidth;
  textCanvas.height = originalHeight;
  const textCtx = textCanvas.getContext("2d");
  
  const originalData = ctx.getImageData(0, 0, originalWidth, originalHeight);
  const originalPixels = originalData.data;

  // 中央線を除いた文字のピクセルをtextCanvasにコピー
  for (let y = 0; y < originalHeight; y++) {
    for (let x = 0; x < originalWidth; x++) {
      const index = (y * originalWidth + x) * 4;
      const alpha = originalPixels[index + 3];
      
      // 中央線のピクセルを除外
      if (alpha > 0 && (x < centerX - 2 || x > centerX + 2)) {
        textCtx.fillStyle = `rgba(${originalPixels[index]}, ${originalPixels[index + 1]}, ${originalPixels[index + 2]}, ${alpha})`;
        textCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  // 2. 抽出する領域を決定
  const regionCanvas = document.createElement("canvas");
  if (side === "left") {
    regionCanvas.width = halfWidth;
    regionCanvas.height = originalHeight;
    const regionCtx = regionCanvas.getContext("2d");
    regionCtx.drawImage(textCanvas, 0, 0, halfWidth, originalHeight, 0, 0, halfWidth, originalHeight);
  } else if (side === "right") {
    regionCanvas.width = halfWidth;
    regionCanvas.height = originalHeight;
    const regionCtx = regionCanvas.getContext("2d");
    regionCtx.drawImage(textCanvas, halfWidth, 0, halfWidth, originalHeight, 0, 0, halfWidth, originalHeight);
  } else {
    regionCanvas.width = originalWidth;
    regionCanvas.height = originalHeight;
    const regionCtx = regionCanvas.getContext("2d");
    regionCtx.drawImage(textCanvas, 0, 0);
  }

  // 3. 最終的な28x28のキャンバスを作成
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = 28;
  finalCanvas.height = 28;
  const finalCtx = finalCanvas.getContext("2d");
  finalCtx.imageSmoothingEnabled = false;

  // 4. アスペクト比を維持しながら描画
  finalCtx.drawImage(regionCanvas, 0, 0, 28, 28);
  
  return finalCanvas;
}

function isCanvasBlankExceptLine(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const centerX = Math.floor(canvas.width / 2);
  const pixels = imageData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (x >= centerX - 2 && x <= centerX + 2) {
        continue;
      }

      const idx = (y * canvas.width + x) * 4;
      const a = pixels[idx + 3];
      if (a > 0) {
        return false;
      }
    }
  }
  return true;
}

function downloadProcessedImage() {
  const resultElement = document.getElementById("result");
  if (isCanvasBlankExceptLine(canvas)) {
    resultElement.textContent = "Result: 何も描かれていません。ダウンロードできませんでした。";
    return;
  }
  const drawnSide = getDrawnSideWithThreshold(canvas);
  const finalImage = extractRegion(canvas, drawnSide);

  const finalCtx = finalImage.getContext("2d");
  const imgData = finalCtx.getImageData(0, 0, 28, 28);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
    const inverted = 255 - avg;
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = inverted;
  }
  finalCtx.putImageData(imgData, 0, 0);

  const link = document.createElement('a');
  link.download = 'processed_digit.png';
  link.href = finalImage.toDataURL('image/png');
  link.click();
  
  resultElement.textContent = "Result: 画像をダウンロードしました。";
}

async function predict() {
  const resultElement = document.getElementById("result");
  if (isCanvasBlankExceptLine(canvas)) {
    resultElement.textContent = "Result: 何も書かれていません。";
    return;
  }
  const drawnSide = getDrawnSideWithThreshold(canvas);
  const finalImage = extractRegion(canvas, drawnSide);

  const finalCtx = finalImage.getContext("2d");
  const imgData = finalCtx.getImageData(0, 0, 28, 28);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
    const inverted = 255 - avg;
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = inverted;
  }
  finalCtx.putImageData(imgData, 0, 0);

  const finalBase64 = finalImage.toDataURL("image/png");
  resultElement.textContent = "読み込み中...";
  try {
    const res = await fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: finalBase64 })
    });

    const data = await res.json();
    if (data.confidence < 0.8) {
      resultElement.textContent = "Result: 自信がありません。もう一度お願いします。";
    } else {
      resultElement.textContent =
        "Result: " + data.result + "（信頼度: " + (data.confidence * 100).toFixed(2) + "%）";
    }
  } catch (err) {
    resultElement.textContent = "Result: 認識に失敗しました。もう一度入力してください。";
    console.error(err);
  }
}