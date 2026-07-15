const CLOUD_API_URL = "https://api.jsonbin.io/v3/b/66184a7eacd3cb34a83696fb"; 

// Фиксированные курсы валют К БАЗОВЫМ МОНЕТАМ
const RATES = {
    coins: 1.00,
    usd: 67.70,
    eur: 76.60,
    cny: 13.00,
    ton: 113.00,
    btc: 1000000.00,
    saakovska: 1488.67
};

const CURRENCY_LABELS = {
    coins: "🪙 Монетки",
    usd: "💵 Доллар (USD)",
    eur: "💶 Евро (EUR)",
    cny: "🇨🇳 Юань (CNY)",
    ton: "💎 Тонкоин (TON)",
    btc: "🪙 Биткоин (BTC)",
    saakovska: "🏛 Saakovska"
};

let bankDatabase = getDefaultData();
let myAccountNumber = ""; 
let html5QrScanner = null;

function getDefaultData() {
    return {
        accounts: {
            "77777777": { owner: "Управление Банка (Казна) 👑", baseCurrency: "coins", balance: 500000, usd: 10000, eur: 5000, cny: 50000, ton: 5000, btc: 5, saakovska: 100, cvv: "8354", formattedNumber: "7777 7777" },
            "21535477": { owner: "Центральный расчетный счет", baseCurrency: "coins", balance: 1000, usd: 0, eur: 0, cny: 0, ton: 0, btc: 0, saakovska: 0, cvv: "111", formattedNumber: "2153 5477" }
        },
        logs: [],
        multiCodes: {}
    };
}

function safeGetItem(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
}

function encodeTextToDigits(text) {
    let output = "";
    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i).toString();
        output += code.padStart(5, '0');
    }
    return output;
}

function decodeDigitsToText(digits) {
    if (!digits) return "";
    let output = "";
    for (let i = 0; i < digits.length; i += 5) {
        let chunk = digits.substring(i, i + 5);
        let charCode = parseInt(chunk, 10);
        if (!isNaN(charCode)) {
            output += String.fromCharCode(charCode);
        }
    }
    return output;
}

function generateQR(containerId, text) {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; 
    new QRCode(container, {
        text: text,
        width: 160,
        height: 160,
        colorDark : "#111827",
        colorLight : "#fff8db",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function startQRScanner() {
    document.getElementById('scanner-modal').style.display = "flex";
    html5QrScanner = new Html5Qrcode("qr-reader");
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        stopQRScanner();
        let token = decodedText.trim().replace(/\s+/g, '');
        if (!token.startsWith("TX-")) { alert("❌ Неверный формат QR-кода!"); return; }
        
        document.getElementById('coupon-code-input').value = token;
        redeemSecureCode();
    };
    
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };
    html5QrScanner.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
    .catch((err) => {
        html5QrScanner.start({ facingMode: "user" }, config, qrCodeSuccessCallback).catch(e => {
            alert("Не удалось запустить камеру!");
            stopQRScanner();
        });
    });
}

function stopQRScanner() {
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => {
            document.getElementById('scanner-modal').style.display = "none";
        }).catch(() => {
            document.getElementById('scanner-modal').style.display = "none";
        });
    } else {
        document.getElementById('scanner-modal').style.display = "none";
    }
}

// ПОЛНОЕ СКАЧИВАНИЕ ИЗ ОБЛАКА
async function loadBankData() {
    let localData = safeGetItem('homeBankGlobalData');
    if (localData) {
        try { bankDatabase = JSON.parse(localData); } catch(e){}
    }
    try {
        const response = await fetch(CLOUD_API_URL + "/latest", {
            method: "GET",
            headers: { "X-Master-Key": "$2b$10$P1W7p2S4v9zG1u.vA7vTeO6HwNf02Bq2V3sW9Xh7h1gXJ9yB7k8D6" }
        });
        if (response.ok) {
            let resData = await response.json();
            if (resData.record && resData.record.accounts) {
                bankDatabase = resData.record;
                if (!bankDatabase.multiCodes) bankDatabase.multiCodes = {};
                for (let acc in bankDatabase.accounts) {
                    let a = bankDatabase.accounts[acc];
                    if (!a.baseCurrency) a.baseCurrency = "coins";
                    if (a.usd === undefined) a.usd = 0;
                    if (a.eur === undefined) a.eur = 0;
                    if (a.cny === undefined) a.cny = 0;
                    if (a.ton === undefined) a.ton = 0;
                    if (a.btc === undefined) a.btc = 0;
                    if (a.saakovska === undefined) a.saakovska = 0;
                }
                safeSetItem('homeBankGlobalData', JSON.stringify(bankDatabase));
            }
        }
    } catch (e) { console.log("Автономный режим"); }
}

// БЕЗОПАСНЫЙ ПУШ В ОБЛАКО
async function saveBankData() {
    let currentSessionClean = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let localUserData = bankDatabase.accounts[currentSessionClean] ? JSON.parse(JSON.stringify(bankDatabase.accounts[currentSessionClean])) : null;
    let localLogs = bankDatabase.logs ? JSON.parse(JSON.stringify(bankDatabase.logs)) : [];
    let localMultiCodes = bankDatabase.multiCodes ? JSON.parse(JSON.stringify(bankDatabase.multiCodes)) : {};

    try {
        const response = await fetch(CLOUD_API_URL + "/latest", {
            method: "GET",
            headers: { "X-Master-Key": "$2b$10$P1W7p2S4v9zG1u.vA7vTeO6HwNf02Bq2V3sW9Xh7h1gXJ9yB7k8D6" }
        });
        
        if (response.ok) {
            let cloudRes = await response.json();
            if (cloudRes.record && cloudRes.record.accounts) {
                let cloudDatabase = cloudRes.record;
                if (localUserData) {
                    cloudDatabase.accounts[currentSessionClean] = localUserData;
                }
                let freshLogs = cloudDatabase.logs || [];
                localLogs.forEach(localLog => {
                    if (!freshLogs.some(cloudLog => cloudLog.txId === localLog.txId)) {
                        freshLogs.unshift(localLog);
                    }
                });
                cloudDatabase.logs = freshLogs;
                if (!cloudDatabase.multiCodes) cloudDatabase.multiCodes = {};
                for (let codeId in localMultiCodes) {
                    cloudDatabase.multiCodes[codeId] = localMultiCodes[codeId];
                }
                bankDatabase = cloudDatabase;
            }
        }
    } catch (e) { console.log("Ошибка слияния"); }

    safeSetItem('homeBankGlobalData', JSON.stringify(bankDatabase));
    try {
        await fetch(CLOUD_API_URL, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": "$2b$10$P1W7p2S4v9zG1u.vA7vTeO6HwNf02Bq2V3sW9Xh7h1gXJ9yB7k8D6"
            },
            body: JSON.stringify(bankDatabase)
        });
    } catch (e) { console.log("Ошибка отправки сети"); }
}

async function manualCloudRefresh() {
    await loadBankData();
    updateUI();
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadBankData();
    let savedNumber = safeGetItem('activeBankSession');
    if (savedNumber) {
        savedNumber = savedNumber.trim().replace(/\s+/g, '');
        if (bankDatabase.accounts[savedNumber]) {
            myAccountNumber = savedNumber;
            autoLogin(savedNumber);
        }
    }
});

function loginAccount() {
    let numberInput = document.getElementById('login-number').value.trim().replace(/\s+/g, '');
    let cvvInput = document.getElementById('login-cvv').value.trim().replace(/\s+/g, '');
    if (!bankDatabase.accounts[numberInput] || bankDatabase.accounts[numberInput].cvv !== cvvInput) {
        alert("Неверные данные!"); return;
    }
    safeSetItem('activeBankSession', numberInput);
    myAccountNumber = numberInput;
    autoLogin(numberInput);
}

function autoLogin(accountNumber) {
    let cleanAccountNumber = accountNumber.toString().trim().replace(/\s+/g, '');
    let user = bankDatabase.accounts[cleanAccountNumber];
    if (!user) return;
    
    document.getElementById('display-name').innerText = user.owner;
    document.getElementById('display-number').innerText = user.formattedNumber || cleanAccountNumber;
    document.getElementById('display-cvv').innerText = user.cvv;
    document.getElementById('user-change-currency').value = user.baseCurrency || "coins";
    
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    document.getElementById('chek-box-admin').style.display = "none";
    document.getElementById('chek-box-transfer').style.display = "none";
    document.getElementById('chek-box-multi').style.display = "none";
    
    if (cleanAccountNumber === "77777777") {
        document.getElementById('history-title').innerText = "📋 Глобальный audit транзакций (Казна)";
        document.getElementById('admin-panel').style.display = "block"; 
    } else {
        document.getElementById('history-title').innerText = "📋 История ваших операций";
        document.getElementById('admin-panel').style.display = "none"; 
    }
    updateExchangePreview();
    updateUI();
}

async function changeUserCurrency() {
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let newCurrency = document.getElementById('user-change-currency').value;
    await loadBankData();
    if (bankDatabase.accounts[myCleanNumber]) {
        bankDatabase.accounts[myCleanNumber].baseCurrency = newCurrency;
        await saveBankData();
        updateExchangePreview();
        updateUI();
        alert(`🔄 Валюта изменена на: ${CURRENCY_LABELS[newCurrency]}`);
    }
}

function logout() {
    try { localStorage.removeItem('activeBankSession'); } catch(e){}
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
    document.getElementById('admin-panel').style.display = "none";
}

function updateExchangePreview() {
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let user = bankDatabase.accounts[myCleanNumber];
    let baseCurr = user ? (user.baseCurrency || "coins") : "coins";
    const direction = document.getElementById('exchange-direction').value;
    const amount = parseFloat(document.getElementById('exchange-input-amount').value) || 0;
    const preview = document.getElementById('exchange-preview-text');
    const ratesBox = document.getElementById('exchange-live-rates-box');
    
    let userRate = RATES[baseCurr];
    let showName = baseCurr.toUpperCase();
    
    ratesBox.innerHTML = `
        📊 <b>Рыночные котировки в вашей валюте (${showName}):</b><br>
        • 1 🪙 Монетка = ${(1 / userRate).toFixed(4)} ${showName}<br>
        • 1 💵 Доллар (USD) = ${(RATES.usd / userRate).toFixed(2)} ${showName}<br>
        • 1 💶 Евро (EUR) = ${(RATES.eur / userRate).toFixed(2)} ${showName}<br>
        • 1 🇨🇳 Юань (CNY) = ${(RATES.cny / userRate).toFixed(2)} ${showName}<br>
        • 1 💎 Тонкоин (TON) = ${(RATES.ton / userRate).toFixed(2)} ${showName}<br>
        • 1 🪙 Биткоин (BTC) = ${(RATES.btc / userRate).toFixed(2)} ${showName}<br>
        • 1 🏛 Saakovska (SAK) = ${(RATES.saakovska / userRate).toFixed(2)} ${showName}
    `;

    let result = 0;
    if (direction === "coins_to_usd") result = amount / RATES.usd;
    else if (direction === "usd_to_coins") result = amount * RATES.usd;
    else if (direction === "coins_to_eur") result = amount / RATES.eur;
    else if (direction === "eur_to_coins") result = amount * RATES.eur;
    else if (direction === "coins_to_cny") result = amount / RATES.cny;
    else if (direction === "cny_to_coins") result = amount * RATES.cny;
    else if (direction === "coins_to_ton") result = amount / RATES.ton;
    else if (direction === "ton_to_coins") result = amount * RATES.ton;
    else if (direction === "coins_to_btc") result = amount / RATES.btc;
    else if (direction === "btc_to_coins") result = amount * RATES.btc;
    else if (direction === "coins_to_saakovska") result = amount / RATES.saakovska;
    else if (direction === "saakovska_to_coins") result = amount * RATES.saakovska;
    
    preview.innerText = `Вы получите: ${result.toFixed(4)}`;
}

async function executeCurrencyExchange() {
    const direction = document.getElementById('exchange-direction').value;
    const amount = parseFloat(document.getElementById('exchange-input-amount').value);
    if (isNaN(amount) || amount <= 0) { alert("Укажите сумму!"); return; }
    
    await loadBankData();
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let user = bankDatabase.accounts[myCleanNumber];
    
    if (myCleanNumber !== "77777777") {
        if (direction.startsWith("coins_") && user.balance < amount) { alert("Недостаточно монет!"); return; }
        if (direction === "usd_to_coins" && (user.usd || 0) < amount) { alert("Недостаточно USD!"); return; }
        if (direction === "eur_to_coins" && (user.eur || 0) < amount) { alert("Недостаточно EUR!"); return; }
        if (direction === "cny_to_coins" && (user.cny || 0) < amount) { alert("Недостаточно CNY!"); return; }
        if (direction === "ton_to_coins" && (user.ton || 0) < amount) { alert("Недостаточно TON!"); return; }
        if (direction === "btc_to_coins" && (user.btc || 0) < amount) { alert("Недостаточно BTC!"); return; }
        if (direction === "saakovska_to_coins" && (user.saakovska || 0) < amount) { alert("Недостаточно SAK!"); return; }
    }
    
    let logMsg = "";
    if (direction === "coins_to_usd") { user.balance -= amount; user.usd = (user.usd || 0) + (amount / RATES.usd); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.usd).toFixed(2)} USD`; }
    else if (direction === "usd_to_coins") { user.usd -= amount; user.balance += (amount * RATES.usd); logMsg = `Обмен: ${amount} USD -> ${(amount * RATES.usd).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_eur") { user.balance -= amount; user.eur = (user.eur || 0) + (amount / RATES.eur); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.eur).toFixed(2)} EUR`; }
    else if (direction === "eur_to_coins") { user.eur -= amount; user.balance += (amount * RATES.eur); logMsg = `Обмен: ${amount} EUR -> ${(amount * RATES.eur).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_cny") { user.balance -= amount; user.cny = (user.cny || 0) + (amount / RATES.cny); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.cny).toFixed(2)} CNY`; }
    else if (direction === "cny_to_coins") { user.cny -= amount; user.balance += (amount * RATES.cny); logMsg = `Обмен: ${amount} CNY -> ${(amount * RATES.cny).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_ton") { user.balance -= amount; user.ton = (user.ton || 0) + (amount / RATES.ton); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.ton).toFixed(2)} TON`; }
    else if (direction === "ton_to_coins") { user.ton -= amount; user.balance += (amount * RATES.ton); logMsg = `Обмен: ${amount} TON -> ${(amount * RATES.ton).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_btc") { user.balance -= amount; user.btc = (user.btc || 0) + (amount / RATES.btc); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.btc).toFixed(5)} BTC`; }
    else if (direction === "btc_to_coins") { user.btc -= amount; user.balance += (amount * RATES.btc); logMsg = `Обмен: ${amount} BTC -> ${(amount * RATES.btc).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_saakovska") { user.balance -= amount; user.saakovska = (user.saakovska || 0) + (amount / RATES.saakovska); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.saakovska).toFixed(4)} SAK`; }
    else if (direction === "saakovska_to_coins") { user.saakovska -= amount; user.balance += (amount * RATES.saakovska); logMsg = `Обмен: ${amount} SAK -> ${(amount * RATES.saakovska).toFixed(2)} 🪙`; }
    
    let txId = Math.floor(1000 + Math.random() * 9000);
    addTransactionToLog(txId, myCleanNumber, "EXCHANGE", amount, logMsg);
    await saveBankData();
    updateUI();
    document.getElementById('exchange-input-amount').value = "";
    updateExchangePreview();
    alert("💱 Операция выполнена!");
}

async function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const reasonInput = document.getElementById('transfer-reason');
    const selectedCurrency = document.getElementById('transfer-currency').value; 
    const amountInSelectedCurrency = parseFloat(amountInput.value);
    let reason = reasonInput.value.trim();
    
    if (isNaN(amountInSelectedCurrency) || amountInSelectedCurrency <= 0) { alert("Укажите сумму!"); return; }
    await loadBankData(); 
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let sender = bankDatabase.accounts[myCleanNumber];
    
    let amountInCoins = myCleanNumber === "77777777" ? 0 : amountInSelectedCurrency * RATES[selectedCurrency];
    if (targetNumber === myCleanNumber && myCleanNumber !== "77777777") { alert("Нельзя переводить самому себе!"); return; }
    if (myCleanNumber !== "77777777" && amountInCoins > sender.balance) { alert("Недостаточно средств!"); return; }
    if (reason === "") { reason = "Перевод средств"; }
    
    if (myCleanNumber !== "77777777") { sender.balance -= amountInCoins; }
    
    let finalCoinsAmount = amountInSelectedCurrency * RATES[selectedCurrency];
    let txId = Math.floor(1000 + Math.random() * 9000);
    let cryptedReason = encodeTextToDigits(reason);
    
    let secureToken = `TX-${txId}-${myCleanNumber}-${targetNumber}-${Math.floor(finalCoinsAmount)}-${cryptedReason}`;
    addTransactionToLog(txId, myCleanNumber, targetNumber, amountInSelectedCurrency, `Выпущен чек (${selectedCurrency.toUpperCase()}): ${reason}`);
    
    await saveBankData(); 
    updateUI();
    
    document.getElementById('chek-text-transfer').innerText = secureToken;
    document.getElementById('chek-box-transfer').style.display = "block";
    generateQR("qr-transfer-container", secureToken);
    
    amountInput.value = ""; reasonInput.value = ""; document.getElementById('target-account-number').value = "";
}

async function createAdminDebitCode() {
    let targetNumber = document.getElementById('admin-target-account').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('admin-debit-amount');
    const reasonInput = document.getElementById('admin-debit-reason');
    const amountInAdminCurrency = parseFloat(amountInput.value);
    let reason = reasonInput.value.trim();
    
    await loadBankData();
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    if (myCleanNumber !== "77777777") { alert("🔒 Отказано!"); return; }
    if (isNaN(amountInAdminCurrency) || amountInAdminCurrency <= 0) { alert("Укажите сумму!"); return; }
    
    let adminBase = bankDatabase.accounts["77777777"].baseCurrency || "coins";
    let amountInCoins = amountInAdminCurrency * RATES[adminBase];
    if (reason === "") { reason = "Штраф"; }
    
    let txId = Math.floor(1000 + Math.random() * 9000);
    let cryptedReason = encodeTextToDigits(reason);
    
    let secureToken = `TX-${txId}-DEBIT-${targetNumber}-${Math.floor(amountInCoins)}-${cryptedReason}`;
    addTransactionToLog(txId, targetNumber, "00000000", amountInAdminCurrency, `Выписан ордер списания: ${reason}`);
    await saveBankData();
    updateUI();
    
    document.getElementById('chek-text-admin').innerText = secureToken;
    document.getElementById('chek-box-admin').style.display = "block";
    generateQR("qr-admin-container", secureToken);
    
    amountInput.value = ""; reasonInput.value = ""; document.getElementById('admin-target-account').value = "";
}

async function createMultiSplitCode() {
    const poolInput = document.getElementById('multi-total-pool');
    const limitInput = document.getElementById('multi-activations-limit');
    const reasonInput = document.getElementById('multi-custom-reason');
    const totalPoolInUserCurrency = parseFloat(poolInput.value);
    const limit = parseInt(limitInput.value);
    let reason = reasonInput.value.trim();
    
    if (isNaN(totalPoolInUserCurrency) || totalPoolInUserCurrency <= 0) { alert("Укажите сумму!"); return; }
    if (isNaN(limit) || limit <= 0) { alert("Укажите лимит!"); return; }
    
    await loadBankData();
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let user = bankDatabase.accounts[myCleanNumber];
    let userBase = user.baseCurrency || "coins";
    
    let totalPoolInCoins = totalPoolInUserCurrency * RATES[userBase];
    if (myCleanNumber !== "77777777" && totalPoolInCoins > user.balance) { alert("Недостаточно средств!"); return; }
    
    const amountPerActivationInCoins = Math.floor(totalPoolInCoins / limit);
    if (amountPerActivationInCoins <= 0) { alert("Слишком маленький пул!"); return; }
    if (reason === "") { reason = "Конверт с монетами"; }
    if (myCleanNumber !== "77777777") { user.balance -= totalPoolInCoins; }
    
    let txId = Math.floor(1000 + Math.random() * 9000);
    let cryptedReason = encodeTextToDigits(reason);
    
    let secureToken = `TX-${txId}-MULTI-${limit}-${amountPerActivationInCoins}-${cryptedReason}`;
    if (!bankDatabase.multiCodes) bankDatabase.multiCodes = {};
    bankDatabase.multiCodes[txId.toString()] = [];
    
    addTransactionToLog(txId, myCleanNumber, "MULTI", totalPoolInUserCurrency, `Универсальный конверт: ${reason}`);
    await saveBankData();
    updateUI();
    
    document.getElementById('chek-text-multi').innerText = secureToken;
    document.getElementById('chek-box-multi').style.display = "block";
    generateQR("qr-multi-container", secureToken);
    
    poolInput.value = ""; limitInput.value = ""; reasonInput.value = "";
}

async function redeemSecureCode() {
    let inputField = document.getElementById('coupon-code-input');
    let token = inputField.value.trim().replace(/\s+/g, '');
    if (!token.startsWith("TX-")) { alert("Неверный формат!"); return; }
    
    let parts = token.split("-");
    if (parts.length < 6) { alert("Код поврежден!"); return; }
    
    let txId = parts[1];
    let senderAccount = parts[2].trim().replace(/\s+/g, ''); 
    let receiverAccount = parts[3].trim().replace(/\s+/g, ''); 
    let amountInCoins = parseInt(parts[4]); 
    let encryptedReason = parts[5].trim().replace(/\s+/g, ''); 
    
    await loadBankData();
    let currentSessionClean = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let user = bankDatabase.accounts[currentSessionClean];
    let userBase = user.baseCurrency || "coins";
    
    let decryptedReason = decodeDigitsToText(encryptedReason);
    let amountInUserCurrency = amountInCoins / RATES[userBase];

    if (senderAccount !== "MULTI") {
        // ИСПРАВЛЕННАЯ ПРОВЕРКА НАЗНАЧЕНИЯ ОРДЕРА
        // Если это штраф (DEBIT), то нарушитель записан в receiverAccount (parts[3]).
        // Если это обычный перевод, то получатель тоже записан в receiverAccount.
        if (receiverAccount !== currentSessionClean) { 
            alert("🔒 Ошибка! Этот код или ордер выписан на другой счет."); 
            return; 
        }
        
        let activatedTokens = [];
        try { activatedTokens = JSON.parse(safeGetItem('usedHomeBankTokens') || "[]"); } catch(e){}
        if (activatedTokens.includes(txId)) { alert("Код уже активирован!"); return; }
        
        if (senderAccount === "DEBIT") {
            user.balance -= amountInCoins;
            addTransactionToLog(txId, currentSessionClean, "00000000", amountInUserCurrency, `Штраф списан за: ${decryptedReason}`);
            
            let finalAccountBalance = user.balance / RATES[userBase];
            alert(`⚖️ Вам был выписан ордер на штраф!\n\n• Причина: ${decryptedReason}\n• Списано со счета: ${amountInUserCurrency.toFixed(2)} ${userBase.toUpperCase()}\n\n💰 Ваш итоговый счет: ${finalAccountBalance.toFixed(2)} ${userBase.toUpperCase()}`);
        } else {
            user.balance += amountInCoins;
            addTransactionToLog(txId, senderAccount, currentSessionClean, amountInUserCurrency, `Зачислено: ${decryptedReason}`);
            alert(`💰 Получено зачисление (+${amountInUserCurrency.toFixed(2)} ${userBase.toUpperCase()})!`);
        }
        activatedTokens.push(txId);
        safeSetItem('usedHomeBankTokens', JSON.stringify(activatedTokens));
        
    } else {
        let limit = parseInt(receiverAccount); 
        if (!bankDatabase.multiCodes) bankDatabase.multiCodes = {};
        if (!bankDatabase.multiCodes[txId]) bankDatabase.multiCodes[txId] = [];
        let usersWhoRedeemed = bankDatabase.multiCodes[txId];
        
        if (usersWhoRedeemed.includes(currentSessionClean)) { alert("🔒 Вы уже брали долю!"); return; }
        if (usersWhoRedeemed.length >= limit) { alert("🚫 Лимит исчерпан!"); return; }
        
        user.balance += amountInCoins;
        bankDatabase.multiCodes[txId].push(currentSessionClean);
        
        addTransactionToLog(txId, "MULTI", currentSessionClean, amountInUserCurrency, `Доля конверта: ${decryptedReason}`);
        alert(`🎁 Вы забрали свою часть пула (+${amountInUserCurrency.toFixed(2)} ${userBase.toUpperCase()})!`);
    }
    await saveBankData();
    inputField.value = "";
    updateUI();
}

function addTransactionToLog(txId, fromUser, toUser, amount, statusDescription) {
    if (!bankDatabase.logs) bankDatabase.logs = [];
    let timestamp = new Date().toLocaleTimeString();
    let logItem = { txId: txId.toString(), from: fromUser, to: toUser, amount: amount, status: statusDescription, time: timestamp };
    bankDatabase.logs.unshift(logItem);
}

async function createAccount() {
    let name = document.getElementById('reg-name').value.trim();
    let cvv = document.getElementById('reg-custom-cvv').value.trim();
    let selectedCur = document.getElementById('reg-base-currency').value;
    
    if (!name || !cvv) return alert("Заполните все поля!");
    if (cvv.length < 3 || cvv.length > 4) return alert("CVV должен состоять из 3-4 цифр!");

    await loadBankData();
    let newNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    bankDatabase.accounts[newNum] = { 
        owner: name, 
        baseCurrency: selectedCur, 
        balance: 0, 
        usd: 0, 
        eur: 0, 
        cny: 0, 
        ton: 0, 
        btc: 0,
        saakovska: 0,
        cvv: cvv, 
        formattedNumber: newNum.substring(0,4) + " " + newNum.substring(4,8)
    };
    
    await saveBankData();
    
    safeSetItem('activeBankSession', newNum);
    myAccountNumber = newNum;
    
    alert("Счет успешно открыт! Номер вашего счета: " + newNum + "\n\nВы автоматически вошли в личный кабинет.");
    
    document.getElementById('register-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    autoLogin(newNum);
}

function switchZone(zone) {
    if (zone === 'register') {
        let generatedNum = Math.floor(10000000 + Math.random() * 90000000).toString();
        document.getElementById('reg-generated-number').innerText = generatedNum.substring(0,4) + " " + generatedNum.substring(4,8);
        document.getElementById('login-zone').style.display = "none";
        document.getElementById('register-zone').style.display = "block";
    } else {
        document.getElementById('register-zone').style.display = "none";
        document.getElementById('login-zone').style.display = "block";
    }
}

function updateUI() {
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let user = bankDatabase.accounts[myCleanNumber];
    if (user) {
        let baseCurr = user.baseCurrency || "coins";
        let visualBalance = user.balance / RATES[baseCurr];
        document.getElementById('main-balance-render').innerText = `${visualBalance.toFixed(2)} ${baseCurr.toUpperCase()}`;
        document.getElementById('balance-coins').innerText = user.balance.toFixed(2);
        document.getElementById('balance-usd').innerText = (user.usd || 0).toFixed(2);
        document.getElementById('balance-eur').innerText = (user.eur || 0).toFixed(2);
        document.getElementById('balance-cny').innerText = (user.cny || 0).toFixed(2);
        document.getElementById('balance-ton').innerText = (user.ton || 0).toFixed(2);
        document.getElementById('balance-btc').innerText = (user.btc || 0).toFixed(5);
        document.getElementById('balance-saakovska').innerText = (user.saakovska || 0).toFixed(4);
    }
    
    let container = document.getElementById('history-list-container');
    if (!container) return;
    container.innerHTML = "";
    let searchQuery = document.getElementById('search-tx-id').value.trim().replace(/\s+/g, '');
    let hasLogs = false;
    let logs = bankDatabase.logs || [];
    
    logs.forEach(log => {
        if (myCleanNumber === "77777777" || log.from === myCleanNumber || log.to === myCleanNumber) {
            if (searchQuery !== "" && !log.txId.includes(searchQuery)) { return; }
            hasLogs = true;
            let item = document.createElement('div');
            item.className = "history-item";
            let nameFrom = bankDatabase.accounts[log.from] ? bankDatabase.accounts[log.from].owner : log.from;
            let nameTo = bankDatabase.accounts[log.to] ? bankDatabase.accounts[log.to].owner : log.to;
            let isDebitTx = log.status.includes('Штраф') || log.status.includes('ордер') || log.status.includes('списан');
            let isExchange = log.to === "EXCHANGE";
            let color = "#10b981"; if (isDebitTx) color = "#ef4444"; if (isExchange) color = "#3b82f6";
            
            item.innerHTML = `
                [${log.time}] <span class="tx-id">Транзакция: #${log.txId}</span><br>
                ${isExchange ? `Действие: <b>${log.status}</b>` : `Отправитель: <b>${nameFrom}</b> -> Получатель: <b>${nameTo}</b><br>Параметры: <b style="color:${color};">${log.amount} ед.</b> | Статус: <i>${log.status}</i>`}
            `;
            container.appendChild(item);
        }
    });
    if (!hasLogs) container.innerHTML = "<p style='color:#7f8c8d; font-size:13px;'>Транзакции не найдены.</p>";
}