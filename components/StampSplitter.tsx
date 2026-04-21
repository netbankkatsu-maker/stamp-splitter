'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';

interface GridPattern {
  cols: number;
  rows: number;
  count: number;
}

interface LineAdjustment {
  verticalLines: number[];
  horizontalLines: number[];
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
  const [lineAdjustments, setLineAdjustments] = useState<LineAdjustment>({
    verticalLines: [],
    horizontalLines: [],
  });
  const [draggedLine, setDraggedLine] = useState<{
    type: 'vertical' | 'horizontal';
    index: number;
  } | null>(null);
  const [stampPreviews, setStampPreviews] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initializeLines = useCallback((cols: number, rows: number) => {
    const verticalLines = Array.from({ length: cols - 1 }, (_, i) => (i + 1) / cols);
    const horizontalLines = Array.from({ length: rows - 1 }, (_, i) => (i + 1) / rows);
    setLineAdjustments({ verticalLines, horizontalLines });
  }, []);

  const snapToGrid = useCallback((position: number, divisionCount: number) => {
    const snapPositions = Array.from({ length: divisionCount - 1 }, (_, i) => (i + 1) / divisionCount);
    let closestSnap = position;
    let minDistance = Infinity;

    snapPositions.forEach((snap) => {
      const distance = Math.abs(position - snap);
      if (distance < minDistance) {
        minDistance = distance;
        closestSnap = snap;
      }
    });

    if (minDistance < 0.05) {
      return closestSnap;
    }
    return position;
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      const img = new Image();
      img.onload = () => {
        const pattern = GRID_PATTERNS[selectedCount];
        initializeLines(pattern.cols, pattern.rows);
      };
      img.src = event.target?.result as string;
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
      const img = new Image();
      img.onload = () => {
        const pattern = GRID_PATTERNS[selectedCount];
        initializeLines(pattern.cols, pattern.rows);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedLine || !overlayRef.current || !canvasRef.current) return;

    const svg = overlayRef.current;
    const canvas = canvasRef.current;
    const rect = svg.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const pattern = GRID_PATTERNS[selectedCount];
    let newPosition: number;

    if (draggedLine.type === 'vertical') {
      const x = e.clientX - rect.left;
      newPosition = x / canvasRect.width;
      newPosition = Math.max(0, Math.min(1, newPosition));
      newPosition = snapToGrid(newPosition, pattern.cols);

      setLineAdjustments((prev) => {
        const newLines = [...prev.verticalLines];
        newLines[draggedLine.index] = newPosition;
        return { ...prev, verticalLines: newLines };
      });
    } else {
      const y = e.clientY - rect.top;
      newPosition = y / canvasRect.height;
      newPosition = Math.max(0, Math.min(1, newPosition));
      newPosition = snapToGrid(newPosition, pattern.rows);

      setLineAdjustments((prev) => {
        const newLines = [...prev.horizontalLines];
        newLines[draggedLine.index] = newPosition;
        return { ...prev, horizontalLines: newLines };
      });
    }
  }, [draggedLine, selectedCount, snapToGrid]);

  const handleMouseUp = () => {
    setDraggedLine(null);
  };

  // ドキュメント全体でのマウスムーブを処理してスクロール防止
  useEffect(() => {
    if (!draggedLine) return;

    const handleDocMouseMove = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('mousemove', handleDocMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedLine]);

  // キャンバスに分割線を描画
  useEffect(() => {
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

      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.lineWidth = 2;

      lineAdjustments.verticalLines.forEach((posX) => {
        const x = posX * img.width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, img.height);
        ctx.stroke();
      });

      lineAdjustments.horizontalLines.forEach((posY) => {
        const y = posY * img.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(img.width, y);
        ctx.stroke();
      });
    };
    img.src = selectedImage;
  }, [selectedImage, lineAdjustments]);

  // スタンププレビューを生成
  useEffect(() => {
    if (!selectedImage) return;

    const img = new Image();
    img.onload = () => {
      const previews: string[] = [];

      const xPositions = [0, ...lineAdjustments.verticalLines.map(x => x * img.width), img.width];
      const yPositions = [0, ...lineAdjustments.horizontalLines.map(y => y * img.height), img.height];

      xPositions.sort((a, b) => a - b);
      yPositions.sort((a, b) => a - b);

      for (let row = 0; row < yPositions.length - 1 && previews.length < selectedCount; row++) {
        for (let col = 0; col < xPositions.length - 1 && previews.length < selectedCount; col++) {
          const canvas = document.createElement('canvas');
          const cellWidth = xPositions[col + 1] - xPositions[col];
          const cellHeight = yPositions[row + 1] - yPositions[row];

          canvas.width = cellWidth;
          canvas.height = cellHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.drawImage(
            img,
            xPositions[col],
            yPositions[row],
            cellWidth,
            cellHeight,
            0,
            0,
            cellWidth,
            cellHeight
          );

          if (removeWhiteBg) {
            const imageData = ctx.getImageData(0, 0, cellWidth, cellHeight);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
                data[i + 3] = 0;
              }
            }
            ctx.putImageData(imageData, 0, 0);
          }

          previews.push(canvas.toDataURL('image/png'));
        }
      }

      setStampPreviews(previews);
    };
    img.src = selectedImage;
  }, [selectedImage, selectedCount, lineAdjustments, removeWhiteBg]);

  useEffect(() => {
    const pattern = GRID_PATTERNS[selectedCount];
    initializeLines(pattern.cols, pattern.rows);
  }, [selectedCount, initializeLines]);

  const removeWhiteBackground = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

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
        const zip = new JSZip();
        const padding = String(selectedCount).length;

        const xPositions = [0, ...lineAdjustments.verticalLines.map(x => x * img.width), img.width];
        const yPositions = [0, ...lineAdjustments.horizontalLines.map(y => y * img.height), img.height];

        xPositions.sort((a, b) => a - b);
        yPositions.sort((a, b) => a - b);

        let stampIndex = 0;

        for (let row = 0; row < yPositions.length - 1 && stampIndex < selectedCount; row++) {
          for (let col = 0; col < xPositions.length - 1 && stampIndex < selectedCount; col++) {
            const canvas = document.createElement('canvas');
            const cellWidth = xPositions[col + 1] - xPositions[col];
            const cellHeight = yPositions[row + 1] - yPositions[row];

            canvas.width = cellWidth;
            canvas.height = cellHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            ctx.drawImage(
              img,
              xPositions[col],
              yPositions[row],
              cellWidth,
              cellHeight,
              0,
              0,
              cellWidth,
              cellHeight
            );

            if (removeWhiteBg) {
              const imageData = ctx.getImageData(0, 0, cellWidth, cellHeight);
              const processedData = removeWhiteBackground(imageData);
              ctx.putImageData(processedData, 0, 0);
            }

            canvas.toBlob((blob) => {
              if (blob) {
                const stampNum = String(stampIndex + 1).padStart(padding, '0');
                zip.file(`stamp_${stampNum}.png`, blob);

                if (stampIndex === selectedCount - 1) {
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

            stampIndex++;
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
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            LINEスタンプ切り取りツール
          </h1>
          <p className="text-gray-600">
            複数のスタンプが並んだ画像を自由に分割してダウンロード
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
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

          {selectedImage && (
            <>
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
                <p className="text-sm text-gray-600 mt-3">
                  選択中: {GRID_PATTERNS[selectedCount].cols}列 × {GRID_PATTERNS[selectedCount].rows}行
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">
                  分割線を調整（ドラッグで移動、スナップで位置決定）
                </h2>
                <div className="relative bg-gray-100 rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full mx-auto block"
                    style={{ maxHeight: '500px', width: 'auto' }}
                  />
                  <svg
                    ref={overlayRef}
                    className="absolute inset-0 select-none"
                    style={{
                      top: '1rem',
                      left: '1rem',
                      pointerEvents: 'all',
                      touchAction: 'none',
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {lineAdjustments.verticalLines.map((posX, idx) => {
                      const x = (canvasRef.current?.width || 0) * posX;
                      return (
                        <line
                          key={`v-${idx}`}
                          x1={x}
                          y1="0"
                          x2={x}
                          y2={canvasRef.current?.height || 0}
                          stroke="rgba(255, 0, 0, 0)"
                          strokeWidth="10"
                          onMouseDown={() => setDraggedLine({ type: 'vertical', index: idx })}
                          style={{ cursor: 'col-resize' }}
                        />
                      );
                    })}

                    {lineAdjustments.horizontalLines.map((posY, idx) => {
                      const y = (canvasRef.current?.height || 0) * posY;
                      return (
                        <line
                          key={`h-${idx}`}
                          x1="0"
                          y1={y}
                          x2={canvasRef.current?.width || 0}
                          y2={y}
                          stroke="rgba(255, 0, 0, 0)"
                          strokeWidth="10"
                          onMouseDown={() => setDraggedLine({ type: 'horizontal', index: idx })}
                          style={{ cursor: 'row-resize' }}
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>

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

              {stampPreviews.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3">
                    切り取り後のスタンププレビュー（全 {stampPreviews.length}枚）
                  </h2>
                  <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {stampPreviews.map((preview, idx) => (
                        <div key={idx} className="bg-white rounded border border-gray-300 p-1">
                          <img
                            src={preview}
                            alt={`stamp ${idx + 1}`}
                            className="w-full h-auto"
                          />
                          <p className="text-xs text-center text-gray-600 mt-1">
                            {String(idx + 1).padStart(String(selectedCount).length, '0')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
            </>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              使い方
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>スタンプ画像をアップロードします</li>
              <li>必要な枚数を選択します</li>
              <li>プレビューの分割線をドラッグして調整します（スナップで位置決定）</li>
              <li>下のプレビューで切り取り後のスタンプを確認します</li>
              <li>必要に応じて背景透過オプションを有効にします</li>
              <li>「切り取ってダウンロード」をクリックしてZIPファイルを取得</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
