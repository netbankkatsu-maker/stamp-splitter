'use client';

import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';

interface GridPattern {
  cols: number;
  rows: number;
  count: number;
}

const GRID_PATTERNS: Record<number, GridPattern> = {
  8: { cols: 2, rows: 4, count: 8 },
  16: { cols: 4, rows: 4, count: 16 },
  24: { cols: 4, rows: 6, count: 24 },
  32: { cols: 4, rows: 8, count: 32 },
  40: { cols: 5, rows: 8, count: 40 },
};

export default function StampSplitter() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(16);
  const [isLoading, setIsLoading] = useState(false);
  const [removeWhiteBg, setRemoveWhiteBg] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('画像ファイルをドラッグしてください');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const drawPreview = () => {
    if (!selectedImage || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const pattern = GRID_PATTERNS[selectedCount];
      const cellWidth = img.width / pattern.cols;
      const cellHeight = img.height / pattern.rows;

      // グリッドラインの描画
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;

      // 縦線
      for (let i = 1; i < pattern.cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellWidth, 0);
        ctx.lineTo(i * cellWidth, img.height);
        ctx.stroke();
      }

      // 横線
      for (let i = 1; i < pattern.rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellHeight);
        ctx.lineTo(img.width, i * cellHeight);
        ctx.stroke();
      }
    };
    img.src = selectedImage;
  };

  useEffect(() => {
    drawPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImage, selectedCount]);

  const removeWhiteBackground = (
    imageData: ImageData
  ): ImageData => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 白背景（RGB 255,255,255）を透過に変換
      if (r === 255 && g === 255 && b === 255) {
        data[i + 3] = 0;
      }
    }
    return imageData;
  };

  const handleSplitAndDownload = async () => {
    if (!selectedImage || !imageFile) {
      alert('画像を選択してください');
      return;
    }

    setIsLoading(true);

    try {
      const img = new Image();
      img.onload = async () => {
        const pattern = GRID_PATTERNS[selectedCount];
        const cellWidth = img.width / pattern.cols;
        const cellHeight = img.height / pattern.rows;

        const zip = new JSZip();
        const padding = String(selectedCount).length;

        for (let row = 0; row < pattern.rows; row++) {
          for (let col = 0; col < pattern.cols; col++) {
            const index = row * pattern.cols + col;
            if (index >= selectedCount) break;

            // キャンバスに1つのスタンプを描画
            const canvas = document.createElement('canvas');
            canvas.width = cellWidth;
            canvas.height = cellHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            // 背景を透明にして描画
            ctx.fillStyle = 'rgba(255, 255, 255, 0)';
            ctx.fillRect(0, 0, cellWidth, cellHeight);

            ctx.drawImage(
              img,
              col * cellWidth,
              row * cellHeight,
              cellWidth,
              cellHeight,
              0,
              0,
              cellWidth,
              cellHeight
            );

            // 白背景を透過に変換するオプション
            if (removeWhiteBg) {
              const imageData = ctx.getImageData(0, 0, cellWidth, cellHeight);
              const processedData = removeWhiteBackground(imageData);
              ctx.putImageData(processedData, 0, 0);
            }

            // PNGとしてZIPに追加
            canvas.toBlob((blob) => {
              if (blob) {
                const stampNum = String(index + 1).padStart(padding, '0');
                zip.file(`stamp_${stampNum}.png`, blob);

                // すべてのスタンプが完成したらダウンロード
                if (index === selectedCount - 1) {
                  zip.generateAsync({ type: 'blob' }).then((content) => {
                    const url = URL.createObjectURL(content);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'stamps.zip';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setIsLoading(false);
                  });
                }
              }
            }, 'image/png');
          }
        }
      };
      img.src = selectedImage;
    } catch (error) {
      console.error('エラーが発生しました:', error);
      alert('エラーが発生しました');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            LINEスタンプ切り取りツール
          </h1>
          <p className="text-gray-600">
            複数のスタンプが並んだ画像を均等分割してダウンロード
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* 画像アップロードエリア */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center mb-6 hover:border-blue-500 transition cursor-pointer bg-blue-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <svg
              className="mx-auto h-12 w-12 text-blue-400 mb-2"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-6-12l6 6m0 0v12m0-12h-6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-gray-700 font-semibold mb-1">
              画像をドラッグ&ドロップ
            </p>
            <p className="text-sm text-gray-500">
              またはクリックして選択
            </p>
          </div>

          {/* 画像プレビュー */}
          {selectedImage && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                プレビュー（分割ラインを表示）
              </h2>
              <div className="bg-gray-100 rounded-lg p-4 overflow-auto max-h-96">
                <canvas
                  ref={canvasRef}
                  className="max-w-full mx-auto"
                />
              </div>
            </div>
          )}

          {/* 分割数選択 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              分割数を選択
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[8, 16, 24, 32, 40].map((count) => (
                <button
                  key={count}
                  onClick={() => setSelectedCount(count)}
                  className={`py-3 px-4 rounded-lg font-semibold transition ${
                    selectedCount === count
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {count}枚
                </button>
              ))}
            </div>
            {selectedImage && (
              <p className="text-sm text-gray-600 mt-3">
                選択中: {GRID_PATTERNS[selectedCount].cols}列 × {GRID_PATTERNS[selectedCount].rows}行
              </p>
            )}
          </div>

          {/* 背景透過オプション */}
          {selectedImage && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeWhiteBg}
                  onChange={(e) => setRemoveWhiteBg(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <span className="ml-2 text-gray-700">
                  白背景を透過に変換（JPG画像用）
                </span>
              </label>
            </div>
          )}

          {/* ダウンロードボタン */}
          {selectedImage && (
            <button
              onClick={handleSplitAndDownload}
              disabled={isLoading}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 active:scale-95'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  処理中...
                </span>
              ) : (
                '切り取ってダウンロード'
              )}
            </button>
          )}

          {/* 使い方 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              使い方
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>スタンプ画像をアップロードします</li>
              <li>必要な枚数を選択します</li>
              <li>プレビューで分割線を確認します</li>
              <li>必要に応じて背景透過オプションを有効にします</li>
              <li>「切り取ってダウンロード」をクリックしてZIPファイルを取得</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
