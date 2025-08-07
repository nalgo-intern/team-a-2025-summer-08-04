// web.js
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

function extractRegion(canvas, side) {
  const originalWidth = canvas.width;
  const originalHeight = canvas.height;
  const halfWidth = originalWidth / 2;

  // 1. 中央線を削除した一時的なキャンバスを作成
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = originalWidth;
  tempCanvas.height = originalHeight;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, 0, 0);
  const centerX = originalWidth / 2;
  tempCtx.clearRect(centerX - 2, 0, 4, originalHeight);

  // 2. 抽出する領域を決定
  const regionCanvas = document.createElement("canvas");
  if (side === "left") {
    regionCanvas.width = halfWidth;
    regionCanvas.height = originalHeight;
    const regionCtx = regionCanvas.getContext("2d");
    regionCtx.drawImage(tempCanvas, 0, 0, halfWidth, originalHeight, 0, 0, halfWidth, originalHeight);
  } else if (side === "right") {
    regionCanvas.width = halfWidth;
    regionCanvas.height = originalHeight;
    const regionCtx = regionCanvas.getContext("2d");
    regionCtx.drawImage(tempCanvas, halfWidth, 0, halfWidth, originalHeight, 0, 0, halfWidth, originalHeight);
  } else {
    regionCanvas.width = originalWidth;
    regionCanvas.height = originalHeight;
    const regionCtx = regionCanvas.getContext("2d");
    regionCtx.drawImage(tempCanvas, 0, 0);
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

// 追加: 中央線の消去処理（predict()とdownloadProcessedImage()の中で共通）
function removeCenterLine(ctx) {
  const centerX = 14;
  ctx.clearRect(centerX - 1, 0, 3, 28);  // 13〜15ピクセルを白で消去
}


function checkDrawnSide(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let leftDrawn = false;
  let rightDrawn = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];
      if (alpha > 0) {
        if (x < canvas.width / 2) leftDrawn = true;
        else rightDrawn = true;
      }
    }
  }

  if (leftDrawn && !rightDrawn) return "left";
  if (!leftDrawn && rightDrawn) return "right";
  return "both";
}

function extractHalfAndExpand(canvas, side) {
  const originalWidth = canvas.width;
  const originalHeight = canvas.height;
  const halfWidth = originalWidth / 2;

  // 1. 一時的なキャンバスに元の画像をコピー
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = originalWidth;
  tempCanvas.height = originalHeight;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, 0, 0);

  // 2. 中央線を確実に削除
  const centerX = originalWidth / 2;
  tempCtx.clearRect(centerX - 2, 0, 4, originalHeight); // 線の幅を広めに取り、確実に消去

  // 3. 抽出した半分の画像を保持するキャンバスを作成
  const halfCanvas = document.createElement("canvas");
  halfCanvas.width = halfWidth;
  halfCanvas.height = originalHeight;
  const halfCtx = halfCanvas.getContext("2d");

  // 4. 指定された側（左または右）から画像を抽出
  const sx = side === "left" ? 0 : halfWidth;
  halfCtx.drawImage(tempCanvas, sx, 0, halfWidth, originalHeight, 0, 0, halfWidth, originalHeight);

  // 5. 最終的な28x28のキャンバスを作成
  const expanded = document.createElement("canvas");
  expanded.width = 28;
  expanded.height = 28;
  const expandCtx = expanded.getContext("2d");
  expandCtx.imageSmoothingEnabled = false;


  expandCtx.fillStyle = "black";
  expandCtx.fillRect(0, 0, 28, 28);

  // 6. 抽出した半分の画像を28x28に描画
  expandCtx.drawImage(halfCanvas, 0, 0, 28, 28);

  return expanded;
}


function isCanvasBlankExceptLine(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const centerX = Math.floor(canvas.width / 2);
  const pixels = imageData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      // 中央線の領域をスキップ
      if (x >= centerX - 2 && x <= centerX + 2) {
        continue;
      }

      const idx = (y * canvas.width + x) * 4;
      const a = pixels[idx + 3]; // アルファ値を取得

      // アルファ値が0より大きいピクセルがあれば、描画されていると判断
      if (a > 0) {
        return false;
      }
    }
  }
  return true;
}
function downloadProcessedImage() {
  const resultElement = document.getElementById("result");

  // 1. 縦線を除いて空白かどうかをチェック
  if (isCanvasBlankExceptLine(canvas)) {
    resultElement.textContent = "Result: 何も描かれていません。ダウンロードできませんでした。";
    return;
  }

  // 2. 描画された側を判定
  const drawnSide = checkDrawnSide(canvas);

  let finalImage;
  
  if (drawnSide === "left" || drawnSide === "right") {
    // 片側に描かれている場合、その側を抽出して拡大
    finalImage = extractHalfAndExpand(canvas, drawnSide);
  } else {
    // 両側に描かれているか、どちらかわからない場合は全体を処理
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(canvas, 0, 0, 28, 28);
    finalImage = tempCanvas;
  }

  // 3. 白黒反転
  const finalCtx = finalImage.getContext("2d");
  const imgData = finalCtx.getImageData(0, 0, 28, 28);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
    const inverted = 255 - avg;
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = inverted;
  }
  finalCtx.putImageData(imgData, 0, 0);
  removeCenterLine(finalCtx);

  // 4. ダウンロード
  const link = document.createElement('a');
  link.download = 'processed_digit.png';
  link.href = finalImage.toDataURL('image/png');
  link.click();
  
  resultElement.textContent = "Result: 画像をダウンロードしました。";
}

// isCanvasBlankExceptLine関数は既存のものを使用

async function predict() {
  const resultElement = document.getElementById("result");

  // 1. 縦線を除いて空白かどうかをチェック
  if (isCanvasBlankExceptLine(canvas)) {
    resultElement.textContent = "Result: 何も書かれていません。";
    return;
  }

  // 2. 描画領域を厳密に判定
  const drawnSide = getDrawnSideWithThreshold(canvas);

  // 3. 描画領域に応じて画像を抽出・リサイズ
  const finalImage = extractRegion(canvas, drawnSide);

  // 4. 白黒反転
  const finalCtx = finalImage.getContext("2d");
  const imgData = finalCtx.getImageData(0, 0, 28, 28);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
    const inverted = 255 - avg;
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = inverted;
  }
  finalCtx.putImageData(imgData, 0, 0);

  // 5. Base64にしてAPIへ送信
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