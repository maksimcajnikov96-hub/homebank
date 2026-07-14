const CLOUD_API_URL = "https://api.jsonbin.io/v3/b/66184a7eacd3cb34a83696fb"; 

const RATES = {
    coins: 1.00,
    usd: 67.70,
    eur: 76.60,
    cny: 13.00,
    ton: 113.00,
    btc: 1000000.00,
    saakovska: 1488.6752
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
        
        let parts = token.split("-");
        let senderAccount = parts[2] ? parts[2].trim() : "";
        let amountInCoins = parts[4] ? parseInt(parts[4]) : 0;
        let encryptedReason = parts[5] ? parts[5].trim() : "";
        
        let user = bankDatabase.accounts[myAccountNumber];
        let userBase = user ? (user.baseCurrency || "coins") : "coins";
        let amountInUserCurrency = amountInCoins / RATES[userBase];
        let decryptedReason = decodeDigitsToText(encryptedReason);

        if (senderAccount === "DEBIT") {
            let confirmPay = confirm(`⚠️ ОБНАРУЖЕН ШТРАФНОЙ ОРДЕР!\n\nСумма к оплате: ${amountInUserCurrency.toFixed(2)} ${userBase.toUpperCase()}\nПричина: ${decryptedReason}\n\nВы действительно хотите оплатить этот штраф?`);
            if (!confirmPay) { alert("Оплата штрафа отменена пользователем."); return; }
        }

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
                if (localUserData) cloudDatabase.accounts[currentSessionClean] = localUserData;
                
                let freshLogs = cloudDatabase.logs || [];
                localLogs.forEach(localLog => {
                    if (!freshLogs.some(cloudLog => cloudLog.txId === localLog.txId)) {
                        freshLogs.unshift(localLog);
                    }
                });
                cloudDatabase.logs = freshLogs;
                if (!cloudDatabase.multiCodes) cloudDatabase.multiCodes = {};
                for (let codeId in localMultiCodes) cloudDatabase.multiCodes[codeId] = localMultiCodes[codeId];
                bankDatabase = cloudDatabase;
            }
        }
    } catch (e) { console.log("Ошибка слияния с облаком"); }

    safeSetItem('homeBankGlobalData', JSON.stringify(bankDatabase));
    try {
        await fetch(CLOUD_API_URL, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-Master-Key": "$2b$10$P1W7p2S4v9zG1u.vA7vTeO6HwNf02Bq2V3sW9Xh7h1gXJ9yB7k8D6" },
            body: JSON.stringify(bankDatabase)
        });
    } catch (e) { console.log("Ошибка отправки сети"); }
}

async function manualCloudRefresh() { await loadBankData(); updateUI(); alert("Синхронизировано!"); }

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
    if (cleanAccountNumber === "77777777") document.getElementById('admin-panel').style.display = "block"; 
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
    location.reload();
}

function updateExchangePreview() {
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let user = bankDatabase.accounts[myCleanNumber];
    let baseCurr = user ? (user.baseCurrency || "coins") : "coins";
    const amount = parseFloat(document.getElementById('exchange-input-amount').value) || 0;
    const preview = document.getElementById('exchange-preview-text');
    let userRate = RATES[baseCurr];
    preview.innerText = `Вы получите: ${(amount * userRate).toFixed(4)}`;
}

async function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const selectedCurrency = document.getElementById('transfer-currency').value; 
    const amountInSelectedCurrency = parseFloat(amountInput.value);
    
    if (isNaN(amountInSelectedCurrency) || amountInSelectedCurrency <= 0) { alert("Укажите сумму!"); return; }
    await loadBankData(); 
    let myCleanNumber = myAccountNumber.toString().trim().replace(/\s+/g, '');
    let sender = bankDatabase.accounts[myCleanNumber];
    let amountInCoins = myCleanNumber === "77777777" ? 0 : amountInSelectedCurrency * RATES[selectedCurrency];
    if (myCleanNumber !== "77777777" && amountInCoins > sender.balance) { alert("Недостаточно средств!"); return; }
    if (myCleanNumber !== "77777777") sender.balance -= amountInCoins;
    
    let txId = Math.floor(1000 + Math.random() * 9000);
    addTransactionToLog(txId, myCleanNumber, targetNumber, amountInSelectedCurrency, `Перевод (${selectedCurrency.toUpperCase()})`);
    await saveBankData(); 
    updateUI();
    document.getElementById('chek-text-transfer').innerText = `TX-${txId}`;
    document.getElementById('chek-box-transfer').style.display = "block";
    generateQR("qr-transfer-container", `TX-${txId}`);
}

function addTransactionToLog(txId, fromUser, toUser, amount, statusDescription) {
    if (!bankDatabase.logs) bankDatabase.logs = [];
    let logItem = { txId: txId.toString(), from: fromUser, to: toUser, amount: amount, status: statusDescription, time: new Date().toLocaleTimeString() };
    bankDatabase.logs.unshift(logItem);
}

function updateUI() {
    let user = bankDatabase.accounts[myAccountNumber.toString().trim()];
    if (user) {
        let baseCurr = user.baseCurrency || "coins";
        document.getElementById('main-balance-render').innerText = `${(user.balance / RATES[baseCurr]).toFixed(2)} ${baseCurr.toUpperCase()}`;
    }
}