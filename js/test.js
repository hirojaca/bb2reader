let _scannerIsRunning = false; // スキャン中かどうかのフラグ
let _lastResultCode = null;    // 直前に読み取ったコードを記憶する変数
let _matchCount = 0;           // 同じコードが連続して一致した回数

$(function () {
    startScanner();
});

const startScanner = () => {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#photo-area'),
            constraints: {
                width: { min: 1024, ideal: 1920 },
                height: { min: 768, ideal: 1080 },
                facingMode: "environment" // 背面カメラ
            },
        },
        locate: true, 
        tryVertical: true, // 縦向きのバーコードにも対応
        decoder: {
            readers: [
                "ean_reader",   /* 標準の13桁JANコード用 */
                "ean_8_reader"  /* 短縮型の8桁JANコード用 */
            ]
        },
    }, function (err) {
        if (err) {
            console.log("Quagga Init Error:", err);
            return;
        }

        console.log("Initialization finished. Ready to start");
        Quagga.start();
        _scannerIsRunning = true;
    });

    // 描画処理（緑枠などの表示）
    Quagga.onProcessed(function (result) {
        var drawingCtx = Quagga.canvas.ctx.overlay,
            drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
            if (result.boxes) {
                drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                result.boxes.filter(function (box) {
                    return box !== result.box;
                }).forEach(function (box) {
                    Quagga.ImageDebug.drawPath(box, {
                        x: 0,
                        y: 1
                    }, drawingCtx, {
                        color: "green",
                        lineWidth: 2
                    });
                });
            }

            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, {
                    x: 0,
                    y: 1
                }, drawingCtx, {
                    color: "#00F",
                    lineWidth: 2
                });
            }

            if (result.codeResult && result.codeResult.code) {
                Quagga.ImageDebug.drawPath(result.line, {
                    x: 'x',
                    y: 'y'
                }, drawingCtx, {
                    color: 'red',
                    lineWidth: 3
                });
            }
        }
    });

    // バーコードを検出したときの処理
    Quagga.onDetected(function (result) {
        if (!_scannerIsRunning) return; 

        const currentCode = result.codeResult.code;

        // 誤読防止ロジック：直前に読んだ数字と同じかどうかを検証
        if (currentCode === _lastResultCode) {
            _matchCount++; 
        } else {
            _lastResultCode = currentCode; 
            _matchCount = 1;               
        }

        // 【確定判定】15回連続で同じ数字が一致したら処理をコミットする
        if (_matchCount >= 15) {
            _scannerIsRunning = false; 
            Quagga.stop(); // スキャン停止

            // 確定した数値を画面にパッと表示
            $('#result-text').text(currentCode);
            console.log("確定コード:", currentCode);
            
            // カウンターの初期化
            _lastResultCode = null;
            _matchCount = 0;
        }
    });


// --- バーコードバトラーII 解析メインロジック ---
function decodeBarcode(codeStr) {
    if (!codeStr || (codeStr.length !== 8 && codeStr.length !== 13)) {
        return { error: "8桁または13桁のバーコードではありません。" };
    }

    // 文字列を1文字ずつの数字配列に分解（1オリジンに合わせるため先頭にnullを挿入）
    const digits = [null, ...codeStr.split('').map(Number)];
    const len = codeStr.length;

    let format = "";

    // 1. バーコードの分類フローチャート
    if (len === 8) {
        format = "後読み8桁"; [cite: 44, 45]
    } else if (len === 13) {
        const d1 = digits[1];
        const d3 = digits[3];
        const d4 = digits[4];
        const d5 = digits[5];
        const d6 = digits[6];
        const d7 = digits[7];
        const d8 = digits[8];
        const d10 = digits[10];

        if (d1 === 0 || d1 === 1) { [cite: 44]
            if ([0,1,2,3,4,9].includes(d8)) { [cite: 44, 45]
                format = "前読み13桁(通常)"; [cite: 45]
            } else if (d8 === 5 || d8 === 6) { [cite: 44]
                const d45 = d4 * 10 + d5;
                format = (d45 <= 19) ? "前読み13桁(通常)" : "後読み13桁"; [cite: 44, 45]
            } else if (d8 === 7 || d8 === 8) { [cite: 44]
                const d67 = d6 * 10 + d7;
                format = (d67 <= 19) ? "前読み13桁(通常)" : "後読み13桁"; [cite: 44, 45]
            }
        } else {
            if (d3 === 9 && d10 === 5) { [cite: 44]
                format = "前読み13桁(特殊)"; [cite: 45]
            } else {
                format = "後読み13桁"; [cite: 44, 45]
            }
        }
    }

    // 2. フォーマットごとにパラメータを抽出
    let res = { format: format, isCharacter: false, params: {} };
    
    // キャラクターかアイテムかの判定フラグ（判定基準の桁はフォーマットで異なる）
    const judgeDigit = (format === "後読み8桁") ? digits[8] : digits[8]; // 8桁は8番目、13桁も8番目（前読み）か13番目（後読み） [cite: 45, 47, 49, 51]
    const checkTypeDigit = (format === "後読み8桁") ? digits[8] : (format === "後読み13桁" ? digits[13] : digits[8]); [cite: 45, 47, 49, 51]
    
    if (checkTypeDigit <= 4) {
        res.isCharacter = true; [cite: 45, 47, 49, 51]
    }

    if (format === "後読み13桁") {
        parseAttoYomi13(digits, res); [cite: 45]
    } else if (format === "後読み8桁") {
        parseAttoYomi8(digits, res); [cite: 47]
    } else if (format === "前読み13桁(通常)") {
        parseMaeYomi13Normal(digits, res); [cite: 49]
    } else if (format === "前読み13桁(特殊)") {
        parseMaeYomi13Special(digits, res); [cite: 51]
    }

    return res;
}

// --- 各フォーマットのパース詳細 ---

// 後読み13桁
function parseAttoYomi13(d, res) {
    const d6 = d[6], d9 = d[9], d10 = d[10], d11 = d[11], d12 = d[12], d13 = d[13]; [cite: 45, 46, 47]
    if (res.isCharacter) {
        res.params["種族"] = getSpeciesName(d13); [cite: 45]
        res.params["職業"] = (d6 <= 6) ? "戦士" : "魔法使い"; [cite: 45]
        res.params["HP"] = Math.floor(d12 / 2) * 10000 + d11 * 1000 + d10 * 100; [cite: 45]
        res.params["ST"] = ([3, 4].includes(d11) ? 10000 : 0) + ((d11 + 7) % 10) * 1000 + ((d10 + 5) % 10) * 100; [cite: 45]
        res.params["DF"] = ((d10 + 7) % 10) * 1000 + ((d9 + 7) % 10) * 100; [cite: 45, 46]
        res.params["DX"] = d11; [cite: 46]
        res.params["特殊能力"] = getAbilityText(Math.floor(d9 / 4) * 10 + d11); [cite: 46]
    } else {
        res.params["種別"] = getItemTypeName(d13); [cite: 46]
        if (d13 === 5 || d13 === 6) { // 武器
            res.params["ST上昇"] = ( [5,6,7,8].includes(d11)?1:([9,0,1,2].includes(d11)?2:3) ) * 1000 + ((d10 + 5) % 10) * 100; [cite: 46]
        } else if (d13 === 7 || d13 === 8) { // 防具
            res.params["DF上昇"] = ( [3,4,5,6].includes(d10)?0:([7,8,9,0].includes(d10)?1:2) ) * 1000 + ((d9 + 7) % 10) * 100; [cite: 46, 47]
        } else if (d13 === 9) { // HPアップ
            res.params["HP上昇"] = Math.floor(d12 / 8) * 10000 + d11 * 1000 + d10 * 100; [cite: 47]
        }
        res.params["付与特殊能力"] = getAbilityText(Math.floor(d9 / 4) * 10 + d11); [cite: 47]
    }
}

// 後読み8桁
function parseAttoYomi8(d, res) {
    const d1 = d[1], d4 = d[4], d5 = d[5], d6 = d[6], d7 = d[7], d8 = d[8]; [cite: 47, 48, 49]
    if (res.isCharacter) {
        res.params["種族"] = getSpeciesName(d8); [cite: 47]
        res.params["職業"] = (d1 <= 6) ? "戦士" : "魔法使い"; [cite: 47]
        res.params["HP"] = Math.floor(d7 / 2) * 10000 + d6 * 1000 + d5 * 100; [cite: 47]
        res.params["ST"] = ([3, 4].includes(d6) ? 10000 : 0) + ((d6 + 7) % 10) * 1000 + ((d5 + 5) % 10) * 100; [cite: 47, 48]
        res.params["DF"] = ((d5 + 7) % 10) * 1000 + ((d4 + 7) % 10) * 100; [cite: 48]
        res.params["DX"] = d6; [cite: 48]
        res.params["特殊能力"] = getAbilityText(Math.floor(d4 / 4) * 10 + d6); [cite: 48]
    } else {
        res.params["種別"] = getItemTypeName(d8); [cite: 48]
        if (d8 === 5 || d8 === 6) {
            res.params["ST上昇"] = ( [5,6,7,8].includes(d6)?1:([9,0,1,2].includes(d6)?2:3) ) * 1000 + ((d5 + 5) % 10) * 100; [cite: 48]
        } else if (d8 === 7 || d8 === 8) {
            res.params["DF上昇"] = ( [3,4,5,6].includes(d5)?0:([7,8,9,0].includes(d5)?1:2) ) * 1000 + ((d4 + 7) % 10) * 100; [cite: 49]
        } else if (d8 === 9) {
            res.params["HP上昇"] = Math.floor(d7 / 8) * 10000 + d6 * 1000 + d5 * 100; [cite: 49]
        }
        res.params["付与特殊能力"] = getAbilityText(Math.floor(d4 / 4) * 10 + d6); [cite: 49]
    }
}

// 前読み13桁(通常)
function parseMaeYomi13Normal(d, res) {
    const d1=d[1], d2=d[2], d3=d[3], d4=d[4], d5=d[5], d6=d[6], d7=d[7], d8=d[8], d9=d[9], d10=d[10], d11=d[11], d12=d[12]; [cite: 49, 50, 51]
    if (res.isCharacter) {
        res.params["種族"] = getSpeciesName(d8); [cite: 49]
        res.params["職業"] = (d9 <= 6) ? "戦士" : "魔法使い"; [cite: 50]
        res.params["HP"] = d1 * 10000 + d2 * 1000 + d3 * 100; [cite: 50]
        res.params["ST"] = d4 * 1000 + d5 * 100; [cite: 50]
        res.params["DF"] = d6 * 1000 + d7 * 100; [cite: 50]
        res.params["DX"] = d10; [cite: 50]
        res.params["特殊能力"] = getAbilityText(d11 * 10 + d12); [cite: 50]
    } else {
        res.params["種別"] = getItemTypeName(d8); [cite: 50]
        if (d8 === 5 || d8 === 6) {
            res.params["ST上昇"] = d4 * 1000 + d5 * 100; [cite: 50]
        } else if (d8 === 7 || d8 === 8) {
            res.params["DF上昇"] = d6 * 1000 + d7 * 100; [cite: 50, 51]
        } else if (d8 === 9) {
            if (d9 <= 4) {
                res.params["種別"] = "HPアイテム"; [cite: 51]
                res.params["HP上昇"] = d1 * 10000 + d2 * 1000 + d3 * 100; [cite: 51]
            } else if (d9 === 5 || d9 === 6) {
                res.params["種別"] = "情報アイテム"; [cite: 51]
            } else if (d9 === 7) {
                res.params["種別"] = "PPアイテム"; [cite: 51]
                res.params["薬草個数上昇"] = d4 * 10 + d5; [cite: 51]
            } else if (d9 === 8 || d9 === 9) {
                res.params["種別"] = "MPアイテム"; [cite: 51]
                res.params["MP上昇"] = d6 * 10 + d7; [cite: 51]
            }
        }
        res.params["付与特殊能力"] = getAbilityText(d11 * 10 + d12); [cite: 51]
    }
}

// 前読み13桁(特殊)
function parseMaeYomi13Special(d, res) {
    const d1=d[1], d2=d[2], d3=d[3], d4=d[4], d5=d[5], d6=d[6], d7=d[7], d8=d[8], d9=d[9], d10=d[10], d11=d[11], d12=d[12]; [cite: 51, 52, 53, 54, 55]
    if (res.isCharacter) {
        res.params["種族"] = getSpeciesName(d8); [cite: 52]
        res.params["職業"] = (d9 <= 6) ? "戦士" : "魔法使い"; [cite: 52]
        res.params["HP"] = d1 * 10000 + d2 * 1000 + d3 * 100; [cite: 52]
        
        // 基本ST万の位
        let stMan = 0;
        if (d8 === 0 || d8 === 2) stMan = 1; [cite: 52]
        let baseST = stMan * 10000 + d4 * 1000 + d5 * 100; [cite: 52]

        // 基本DF万の位
        let dfMan = 0;
        if (d8 === 1 || d8 === 2) dfMan = 1; [cite: 52]
        let baseDF = dfMan * 10000 + d6 * 1000 + d7 * 100; [cite: 52]

        // 特殊条件の判定
        const d45 = d4 * 10 + d5;
        const d67 = d6 * 10 + d7;
        const condListA = [13, 29, 45, 61, 77, 93]; [cite: 53]
        const condListBC = [14, 30, 46, 62, 78, 94]; [cite: 53]

        if (d8 === 0 && condListA.includes(d45)) {
            baseDF += 10000; // DFの万の位が1に [cite: 53]
        } else if (d8 === 0 && condListBC.includes(d45)) {
            baseDF += 10000; // DFの万の位が1 [cite: 53]
            baseST += 10000; // 内部ST = 表示ST + 10000 [cite: 53]
            if (baseST >= 25600) baseST -= 25600; [cite: 53]
        } else if (d8 === 1 && condListBC.includes(d67)) {
            baseST += 10000; // STの万の位が1 [cite: 53]
            baseDF += 10000; // 内部DF = 表示DF + 10000 [cite: 53]
            if (baseDF >= 25600) baseDF -= 25600; [cite: 53]
        }

        res.params["ST"] = baseST;
        res.params["DF"] = baseDF;
        res.params["DX"] = d10; [cite: 54]
        res.params["特殊能力"] = getAbilityText(d11 * 10 + d12); [cite: 54]
    } else {
        res.params["種別"] = getItemTypeName(d8); [cite: 54]
        if (d8 === 5 || d8 === 6) {
            res.params["ST上昇"] = d4 * 1000 + d5 * 100; [cite: 54]
        } else if (d8 === 7 || d8 === 8) {
            res.params["DF上昇"] = d6 * 1000 + d7 * 100; [cite: 54]
        } else if (d8 === 9) {
            if (d9 <= 4) {
                res.params["種別"] = "HPアイテム"; [cite: 54]
                res.params["HP上昇"] = d1 * 10000 + d2 * 1000 + d3 * 100; [cite: 54]
            } else if (d9 === 5 || d9 === 6) {
                res.params["種別"] = "情報アイテム"; [cite: 54, 55]
            } else if (d9 === 7) {
                res.params["種別"] = "PPアイテム"; [cite: 55]
                res.params["薬草個数上昇"] = d4 * 10 + d5; [cite: 55]
            } else if (d9 === 8 || d9 === 9) {
                res.params["種別"] = "MPアイテム"; [cite: 55]
                res.params["MP上昇"] = d6 * 10 + d7; [cite: 55]
            }
        }
        res.params["付与特殊能力"] = getAbilityText(d11 * 10 + d12); [cite: 55]
    }
}

// --- 名称変換補助関数 ---
function getSpeciesName(val) {
    const list = ["メカ族", "アニマル族", "オーシャン族", "バード族", "ヒューマン族"]; [cite: 45, 47, 49, 52]
    return list[val] || "不明";
}

function getItemTypeName(val) {
    const list = { 5: "武器・使い捨て", 6: "武器", 7: "防具・使い捨て", 8: "防具", 9: "特殊アイテム" }; [cite: 46, 48, 50, 54]
    return list[val] || "不明";
}

// 特殊能力テキスト変換（膨大なため一部抜粋、渡された仕様書のデータを反映してください）
function getAbilityText(id) {
    const padId = String(id).padStart(2, '0');
    const abilities = {
        "00": "なし",
        "11": "アニマル族に3倍剣", "12": "オーシャン族に3倍剣", "13": "バード族に3倍剣", "14": "ヒューマン族に3倍剣", "15": "メカ族に3倍剣", [cite: 56]
        "17": "破壊力50％UP(1.5倍剣)", "18": "破壊力100％UP(2倍剣)", "19": "主人公フラグ", [cite: 56]
        "20": "防御力10％UP(0.9倍盾)", "21": "防御力30％UP(0.7倍盾)", "22": "防御力50％UP(0.5倍盾)", [cite: 56]
        "23": "相手のST30％ダウン", "24": "相手のST50％ダウン", "25": "相手のDF30％ダウン", "26": "相手のDF50％ダウン", "27": "相手のDF80％ダウン", [cite: 56, 57]
        "28": "相手のHP30％ダウン", "29": "相手のHP50％ダウン", [cite: 57]
        "37": "先攻率アップ(+50)", "38": "命中率アップ(初期値230)", "45": "相手の特殊能力をすべて無効化" [cite: 57]
    };
    return `[${padId}] ${abilities[padId] || "??? (C2モード用または未解明)"}`; [cite: 55, 57]
}

// --- 画面への表示処理 ---
function displayStatus(result) {
    if (result.error) {
        alert(result.error);
        return;
    }

    // タイトル部分の設定
    const typeText = `${result.format} / ${result.isCharacter ? "【キャラクター】" : "【アイテム】"}`;
    $('#card-type').text(typeText);

    // パラメータテーブルの生成
    let html = "";
    for (const [key, value] of Object.entries(result.params)) {
        html += `
            <tr>
                <td class="param-name">${key}</td>
                <td>${value}</td>
            </tr>
        `;
    }

    $('#status-tbody').html(html);
    $('#status-area').show(); // 非表示だったエリアを表示
}
}
