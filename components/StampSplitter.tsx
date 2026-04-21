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
  8: { cols: 4, rows: 2, count: 8 },
  16: { cols: 4, rows: 4, count: 16 },
  24: { cols: 4, rows: 6, count: 24 },
  32: { cols: 4, rows: 8, count: 32 },
  40: { cols: 5, rows: 8, count: 40 },
};

export default function StampSplitter() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(8);
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
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

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
        setShowAdjustmentModal(true);
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
        setShowAdjustmentModal(true);
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
    if (!draggedLine || !overlayRef.current) return;

    const svg = overlayRef.current;
    const svgRect = svg.getBoundingClientRect();

    const pattern = GRID_PATTERNS[selectedCount];
    let newPosition: number;

    if (draggedLine.type === 'vertical') {
      const x = e.clientX - svgRect.left;
      const ratio = x / svgRect.width;
      newPosition = Math.max(0.01, Math.min(0.99, ratio));
      newPosition = snapToGrid(newPosition, pattern.cols);

      setLineAdjustments((prev) => {
        const newLines = [...prev.verticalLines];
        newLines[draggedLine.index] = newPosition;
        return { ...prev, verticalLines: newLines };
      });
    } else {
      const y = e.clientY - svgRect.top;
      const ratio = y / svgRect.height;
      newPosition = Math.max(0.01, Math.min(0.99, ratio));
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

          {selectedImage && !showAdjustmentModal && (
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

              <button
                onClick={() => setShowAdjustmentModal(true)}
                className="w-full py-3 px-6 rounded-lg font-semibold text-white bg-blue-500 hover:bg-blue-600 transition"
              >
                分割線を調整
              </button>
            </>
          )}

          {!selectedImage && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                使い方
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>スタンプ画像をアップロードします</li>
                <li>必要な枚数を選択します</li>
                <li>「分割線を調整」ボタンをクリックします</li>
                <li>ポップアップで分割線をドラッグして調整します</li>
                <li>「確定」ボタンで確認します</li>
                <li>「切り取ってダウンロード」でZIPファイルを取得</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* 分割線調整モーダル */}
      {showAdjustmentModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                分割線を調整 ({GRID_PATTERNS[selectedCount].cols}列 × {GRID_PATTERNS[selectedCount].rows}行)
              </h2>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* キャンバスとSVG */}
              <div className="relative bg-gray-100 rounded-lg mb-6 inline-block w-full">
                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto block rounded"
                    style={{ maxHeight: '600px', display: 'block' }}
                  />
                  <svg
                    ref={overlayRef}
                    className="select-none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'all',
                      touchAction: 'none',
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {/* 縦線 */}
                    {lineAdjustments.verticalLines.map((posX, idx) => {
                      const canvasWidth = canvasRef.current?.width || 1;
                      const svgWidth = overlayRef.current?.getBoundingClientRect().width || canvasWidth;
                      const x = (svgWidth / canvasWidth) * posX * canvasWidth;
                      return (
                        <g
                          key={`v-${idx}`}
                          onMouseDown={() => setDraggedLine({ type: 'vertical', index: idx })}
                        >
                          <line
                            x1={x}
                            y1="0"
                            x2={x}
                            y2="100%"
                            stroke="rgba(255, 0, 0, 0.6)"
                            strokeWidth="2"
                          />
                          <circle
                            cx={x}
                            cy="50%"
                            r="14"
                            fill="rgba(255, 100, 100, 0.9)"
                            stroke="rgba(255, 0, 0, 1)"
                            strokeWidth="2"
                            style={{
                              cursor: 'grab',
                              filter: draggedLine?.type === 'vertical' && draggedLine.index === idx
                                ? 'drop-shadow(0 0 12px rgba(255, 0, 0, 0.9))'
                                : 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.4))',
                            }}
                          />
                        </g>
                      );
                    })}

                    {/* 横線 */}
                    {lineAdjustments.horizontalLines.map((posY, idx) => {
                      const canvasHeight = canvasRef.current?.height || 1;
                      const svgHeight = overlayRef.current?.getBoundingClientRect().height || canvasHeight;
                      const y = (svgHeight / canvasHeight) * posY * canvasHeight;
                      return (
                        <g
                          key={`h-${idx}`}
                          onMouseDown={() => setDraggedLine({ type: 'horizontal', index: idx })}
                        >
                          <line
                            x1="0"
                            y1={y}
                            x2="100%"
                            y2={y}
                            stroke="rgba(255, 0, 0, 0.6)"
                            strokeWidth="2"
                          />
                          <circle
                            cx="50%"
                            cy={y}
                            r="14"
                            fill="rgba(255, 100, 100, 0.9)"
                            stroke="rgba(255, 0, 0, 1)"
                            strokeWidth="2"
                            style={{
                              cursor: 'grab',
                              filter: draggedLine?.type === 'horizontal' && draggedLine.index === idx
                                ? 'drop-shadow(0 0 12px rgba(255, 0, 0, 0.9))'
                                : 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.4))',
                            }}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* スタンププレビュー */}
              {stampPreviews.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    切り取り後のプレビュー（全 {stampPreviews.length}枚）
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                      {stampPreviews.map((preview, idx) => (
                        <div key={idx} className="bg-white rounded border border-gray-200 p-1">
                          <img src={preview} alt={`stamp ${idx + 1}`} className="w-full h-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 背景透過オプション */}
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

              {/* ボタン */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdjustmentModal(false)}
                  className="flex-1 py-3 px-6 rounded-lg font-semibold text-gray-700 bg-gray-300 hover:bg-gray-400 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSplitAndDownload}
                  disabled={isLoading}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      処理中...
                    </span>
                  ) : (
                    '切り取ってダウンロード'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
