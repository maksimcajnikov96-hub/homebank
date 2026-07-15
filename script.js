const SUPABASE_URL = "https://dpuoekbyrvkauzmrzxmw.supabase.co";
const SUPABASE_KEY = "ТВОЙ_ДЛИННЫЙ_ANON_PUBLIC_KEY"; // <-- ОБЯЗАТЕЛЬНО замени этот текст на свой длинный public anon ключ из Supabase!

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

let userAccountData = null;
let myAccountNumber = "";
let html5QrScanner = null;

// Универсальная функция запросов к Supabase с детальным логированием ошибок
async function supabaseFetch(endpoint, method = "GET", body = null) {
    if (!SUPABASE_KEY || SUPABASE_KEY === "ТВОЙ_ДЛИННЫЙ_ANON_PUBLIC_KEY") {
        console.error("Критическая ошибка: Не указан SUPABASE_KEY в коде script.js!");
        alert("⚠️ Настройка банка не завершена: отсутствует ключ API базы данных.");
        return null;
    }

    const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, config);
        if (!response.ok) {
            const errText = await response.text();
            console.error(`Ошибка Supabase REST (${endpoint}):`, errText);
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error("Сбой сетевого запроса к Supabase:", e);
        return null;
    }
}

function safeGetItem(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function safeSetItem(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

function generateUniqueTxId() { return Math.random().toString(36).substring(2, 9).toUpperCase(); }

function encodeTextToDigits(text) {
    let output = "";
    for (let i = 0; i < text.length; i++) { output += text.charCodeAt(i).toString().padStart(5, '0'); }
    return output;
}

function decodeDigitsToText(digits) {
    if (!digits) return "";
    let output = "";
    for (let i = 0; i < digits.length; i += 5) {
        let charCode = parseInt(digits.substring(i, i + 5), 10);
        if (!isNaN(charCode)) output += String.fromCharCode(charCode);
    }
    return output;
}

function generateQR(containerId, text) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    new QRCode(container, { text, width: 160, height: 160, colorDark: "#111827", colorLight: "#fff8db", correctLevel: QRCode.CorrectLevel.H });
}

function startQRScanner() {
    document.getElementById('scanner-modal').style.display = "flex";
    html5QrScanner = new Html5Qrcode("qr-reader");
    const qrCallback = (decodedText) => {
        stopQRScanner();
        let token = decodedText.trim().replace(/\s+/g, '');
        if (!token.startsWith("TX-")) { alert("❌ Неверный формат QR-кода!"); return; }
        document.getElementById('coupon-code-input').value = token;
        redeemSecureCode();
    };
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };
    html5QrScanner.start({ facingMode: "environment" }, config, qrCallback)
    .catch(() => {
        html5QrScanner.start({ facingMode: "user" }, config, qrCallback).catch(() => {
            alert("Не удалось запустить камеру!"); stopQRScanner();
        });
    });
}

function stopQRScanner() {
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => { document.getElementById('scanner-modal').style.display = "none"; })
        .catch(() => { document.getElementById('scanner-modal').style.display = "none"; });
    } else {
        document.getElementById('scanner-modal').style.display = "none";
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    let savedNumber = safeGetItem('activeBankSession');
    if (savedNumber) {
        myAccountNumber = savedNumber.trim().replace(/\s+/g, '');
        const res = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "GET");
        if (res && res.length > 0) {
            userAccountData = res[0];
            autoLogin(myAccountNumber);
        }
    }
});

async function loginAccount() {
    let rawNumber = document.getElementById('login-number').value;
    // Очищаем любые пробелы: "7777 7777" превратится в "77777777"
    let numberInput = rawNumber.trim().replace(/\s+/g, '');
    let cvvInput = document.getElementById('login-cvv').value.trim().replace(/\s+/g, '');
    
    if (!numberInput || !cvvInput) {
        alert("Заполните все поля для авторизации!");
        return;
    }

    const res = await supabaseFetch(`accounts?number=eq.${numberInput}`, "GET");
    if (!res || res.length === 0) {
        alert("Счет не найден в базе! Проверьте номер счета или API-ключ Supabase.");
        return;
    }
    
    if (res[0].cvv !== cvvInput) {
        alert("Неверный CVV безопасности!");
        return;
    }
    
    userAccountData = res[0];
    myAccountNumber = numberInput;
    safeSetItem('activeBankSession', numberInput);
    autoLogin(numberInput);
}

function autoLogin(accountNumber) {
    document.getElementById('display-name').innerText = userAccountData.owner;
    document.getElementById('display-number').innerText = userAccountData.formatted_number || accountNumber;
    document.getElementById('display-cvv').innerText = userAccountData.cvv;
    document.getElementById('user-change-currency').value = userAccountData.base_currency || "coins";
    
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    document.getElementById('chek-box-admin').style.display = "none";
    document.getElementById('chek-box-transfer').style.display = "none";
    document.getElementById('chek-box-multi').style.display = "none";
    
    if (accountNumber === "77777777") {
        document.getElementById('history-title').innerText = "📋 Глобальный audit транзакций (Казна)";
        document.getElementById('admin-panel').style.display = "block"; 
    } else {
        document.getElementById('history-title').innerText = "📋 История ваших операций";
        document.getElementById('admin-panel').style.display = "none"; 
    }
    updateExchangePreview();
    updateUI();
}

async function manualCloudRefresh() {
    const res = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "GET");
    if (res && res.length > 0) userAccountData = res[0];
    updateUI();
}

async function changeUserCurrency() {
    if (userAccountData.is_arrested) return alert("🔒 Операция заблокирована! Ваше имущество арестовано.");
    let newCurrency = document.getElementById('user-change-currency').value;
    
    const update = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "PATCH", { base_currency: newCurrency });
    if (update) {
        userAccountData.base_currency = newCurrency;
        updateExchangePreview();
        updateUI();
        alert(`🔄 Валюта изменена на: ${CURRENCY_LABELS[newCurrency]}`);
    }
}

function logout() {
    localStorage.removeItem('activeBankSession');
    myAccountNumber = ""; userAccountData = null;
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
    // Очищаем инпуты входа
    document.getElementById('login-number').value = "";
    document.getElementById('login-cvv').value = "";
}

function updateExchangePreview() {
    if (!userAccountData) return;
    let baseCurr = userAccountData.base_currency || "coins";
    const direction = document.getElementById('exchange-direction').value;
    const amount = parseFloat(document.getElementById('exchange-input-amount').value) || 0;
    const preview = document.getElementById('exchange-preview-text');
    const ratesBox = document.getElementById('exchange-live-rates-box');
    
    let userRate = RATES[baseCurr];
    let showName = baseCurr.toUpperCase();
    
    ratesBox.innerHTML = `
        📊 <b>Рыночные котировки в твоей валюте (${showName}):</b><br>
        • 1 🪙 Монетка = ${(1 / userRate).toFixed(4)} ${showName}<br>
        • 1 💵 Доллар (USD) = ${(RATES.usd / userRate).toFixed(2)} ${showName}<br>
        • 1 💶 Евро (EUR) = ${(RATES.eur / userRate).toFixed(2)} ${showName}<br>
        • 1 🇨🇳 Юань (CNY) = ${(RATES.cny / userRate).toFixed(2)} ${showName}<br>
        • 1 💎 TON = ${(RATES.ton / userRate).toFixed(2)} ${showName}<br>
        • 1 🪙 Биткоин = ${(RATES.btc / userRate).toFixed(2)} ${showName}<br>
        • 1 🏛 Saakovska = ${(RATES.saakovska / userRate).toFixed(2)} ${showName}
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
    if (userAccountData.is_arrested) return alert("🔒 Операция заблокирована! Ваше имущество арестовано.");
    const direction = document.getElementById('exchange-direction').value;
    const amount = parseFloat(document.getElementById('exchange-input-amount').value);
    if (isNaN(amount) || amount <= 0) return alert("Укажите сумму!");

    const fresh = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "GET");
    if(fresh) userAccountData = fresh[0];

    if (myAccountNumber !== "77777777") {
        if (direction.startsWith("coins_") && userAccountData.balance < amount) return alert("Недостаточно монет!");
        if (direction === "usd_to_coins" && userAccountData.usd < amount) return alert("Недостаточно USD!");
        if (direction === "eur_to_coins" && userAccountData.eur < amount) return alert("Недостаточно EUR!");
        if (direction === "cny_to_coins" && userAccountData.cny < amount) return alert("Недостаточно CNY!");
        if (direction === "ton_to_coins" && userAccountData.ton < amount) return alert("Недостаточно TON!");
        if (direction === "btc_to_coins" && userAccountData.btc < amount) return alert("Недостаточно BTC!");
        if (direction === "saakovska_to_coins" && userAccountData.saakovska < amount) return alert("Недостаточно SAK!");
    }

    let payload = {};
    let logMsg = "";
    if (direction === "coins_to_usd") { payload.balance = userAccountData.balance - amount; payload.usd = userAccountData.usd + (amount / RATES.usd); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.usd).toFixed(2)} USD`; }
    else if (direction === "usd_to_coins") { payload.usd = userAccountData.usd - amount; payload.balance = userAccountData.balance + (amount * RATES.usd); logMsg = `Обмен: ${amount} USD -> ${(amount * RATES.usd).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_eur") { payload.balance = userAccountData.balance - amount; payload.eur = userAccountData.eur + (amount / RATES.eur); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.eur).toFixed(2)} EUR`; }
    else if (direction === "eur_to_coins") { payload.eur = userAccountData.eur - amount; payload.balance = userAccountData.balance + (amount * RATES.eur); logMsg = `Обмен: ${amount} EUR -> ${(amount * RATES.eur).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_cny") { payload.balance = userAccountData.balance - amount; payload.cny = userAccountData.cny + (amount / RATES.cny); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.cny).toFixed(2)} CNY`; }
    else if (direction === "cny_to_coins") { payload.cny = userAccountData.cny - amount; payload.balance = userAccountData.balance + (amount * RATES.cny); logMsg = `Обмен: ${amount} CNY -> ${(amount * RATES.cny).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_ton") { payload.balance = userAccountData.balance - amount; payload.ton = userAccountData.ton + (amount / RATES.ton); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.ton).toFixed(2)} TON`; }
    else if (direction === "ton_to_coins") { payload.ton = userAccountData.ton - amount; payload.balance = userAccountData.balance + (amount * RATES.ton); logMsg = `Обмен: ${amount} TON -> ${(amount * RATES.ton).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_btc") { payload.balance = userAccountData.balance - amount; payload.btc = userAccountData.btc + (amount / RATES.btc); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.btc).toFixed(5)} BTC`; }
    else if (direction === "btc_to_coins") { payload.btc = userAccountData.btc - amount; payload.balance = userAccountData.balance + (amount * RATES.btc); logMsg = `Обмен: ${amount} BTC -> ${(amount * RATES.btc).toFixed(2)} 🪙`; }
    else if (direction === "coins_to_saakovska") { payload.balance = userAccountData.balance - amount; payload.saakovska = userAccountData.saakovska + (amount / RATES.saakovska); logMsg = `Обмен: ${amount} 🪙 -> ${(amount / RATES.saakovska).toFixed(4)} SAK`; }
    else if (direction === "saakovska_to_coins") { payload.saakovska = userAccountData.saakovska - amount; payload.balance = userAccountData.balance + (amount * RATES.saakovska); logMsg = `Обмен: ${amount} SAK -> ${(amount * RATES.saakovska).toFixed(2)} 🪙`; }

    const update = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "PATCH", payload);
    if(update) {
        userAccountData = update[0];
        let txId = generateUniqueTxId();
        await supabaseFetch("logs", "POST", { tx_id: txId, from_user: myAccountNumber, to_user: "EXCHANGE", amount: amount, status: logMsg });
        updateUI();
        document.getElementById('exchange-input-amount').value = "";
        updateExchangePreview();
        alert("💱 Обмен успешно выполнен!");
    }
}

async function transferMoney() {
    if (userAccountData.is_arrested) return alert("🔒 Операция заблокирована! Ваше имущество арестовано.");
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const reasonInput = document.getElementById('transfer-reason');
    const selectedCurrency = document.getElementById('transfer-currency').value; 
    const amountInSelectedCurrency = parseFloat(amountInput.value);
    let reason = reasonInput.value.trim() || "Перевод средств";

    if (isNaN(amountInSelectedCurrency) || amountInSelectedCurrency <= 0) return alert("Укажите сумму!");
    if (targetNumber === myAccountNumber && myAccountNumber !== "77777777") return alert("Нельзя переводить самому себе!");

    const freshSender = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "GET");
    if(freshSender) userAccountData = freshSender[0];

    let amountInCoins = myAccountNumber === "77777777" ? 0 : amountInSelectedCurrency * RATES[selectedCurrency];
    if (myAccountNumber !== "77777777" && amountInCoins > userAccountData.balance) return alert("Недостаточно средств на балансе!");

    if (myAccountNumber !== "77777777") {
        await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "PATCH", { balance: userAccountData.balance - amountInCoins });
    }

    let txId = generateUniqueTxId();
    let cryptedReason = encodeTextToDigits(reason);
    let secureToken = `TX-${txId}-${myAccountNumber}-${targetNumber}-${Math.floor(amountInCoins)}-${cryptedReason}`;

    await supabaseFetch("logs", "POST", { tx_id: txId, from_user: myAccountNumber, to_user: targetNumber, amount: amountInSelectedCurrency, status: `Выпущен чек (${selectedCurrency.toUpperCase()}): ${reason}` });
    
    await manualCloudRefresh();
    document.getElementById('chek-text-transfer').innerText = secureToken;
    document.getElementById('chek-box-transfer').style.display = "block";
    generateQR("qr-transfer-container", secureToken);
    
    amountInput.value = ""; reasonInput.value = ""; document.getElementById('target-account-number').value = "";
}

async function createAdminDebitCode() {
    if (myAccountNumber !== "77777777") return alert("🔒 Отказано!");
    let targetNumber = document.getElementById('admin-target-account').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('admin-debit-amount');
    const reasonInput = document.getElementById('admin-debit-reason');
    const amountInAdminCurrency = parseFloat(amountInput.value);
    let reason = reasonInput.value.trim() || "Штраф";

    if (isNaN(amountInAdminCurrency) || amountInAdminCurrency <= 0) return alert("Укажите сумму штрафа!");

    const targetCheck = await supabaseFetch(`accounts?number=eq.${targetNumber}`, "GET");
    if (!targetCheck || targetCheck.length === 0) return alert(`🚫 Нарушитель со счетом № ${targetNumber} не найден в базе!`);

    let adminBase = userAccountData.base_currency || "coins";
    let amountInCoins = amountInAdminCurrency * RATES[adminBase];
    
    let txId = generateUniqueTxId();
    let cryptedReason = encodeTextToDigits(reason);
    let secureToken = `TX-${txId}-DEBIT-${targetNumber}-${Math.floor(amountInCoins)}-${cryptedReason}`;

    await supabaseFetch("logs", "POST", { tx_id: txId, from_user: targetNumber, to_user: "00000000", amount: amountInAdminCurrency, status: `Выписан ордер списания: ${reason}` });
    
    document.getElementById('chek-text-admin').innerText = secureToken;
    document.getElementById('chek-box-admin').style.display = "block";
    generateQR("qr-admin-container", secureToken);
    
    amountInput.value = ""; reasonInput.value = ""; document.getElementById('admin-target-account').value = "";
}

async function arrestAccount() {
    let target = document.getElementById('admin-arrest-account').value.trim().replace(/\s+/g, '');
    let reason = document.getElementById('admin-arrest-reason').value.trim();
    if (!target || !reason) return alert("Заполните все поля ареста!");

    const check = await supabaseFetch(`accounts?number=eq.${target}`, "GET");
    if (!check || check.length === 0) return alert(`🚫 Счет № ${target} не существует!`);

    const update = await supabaseFetch(`accounts?number=eq.${target}`, "PATCH", { is_arrested: true, arrest_reason: reason });
    if(update) {
        let txId = generateUniqueTxId();
        await supabaseFetch("logs", "POST", { tx_id: txId, from_user: "77777777", to_user: target, amount: 0, status: `Арест имущества: ${reason}` });
        alert(`🔒 Имущество счета ${target} арестовано.`);
        document.getElementById('admin-arrest-account').value = "";
        document.getElementById('admin-arrest-reason').value = "";
        updateUI();
    }
}

async function unarrestAccount() {
    let target = document.getElementById('admin-arrest-account').value.trim().replace(/\s+/g, '');
    if (!target) return alert("Укажите номер счета!");

    const check = await supabaseFetch(`accounts?number=eq.${target}`, "GET");
    if (!check || check.length === 0) return alert(`🚫 Счет № ${target} не существует!`);

    const update = await supabaseFetch(`accounts?number=eq.${target}`, "PATCH", { is_arrested: false, arrest_reason: "" });
    if(update) {
        let txId = generateUniqueTxId();
        await supabaseFetch("logs", "POST", { tx_id: txId, from_user: "77777777", to_user: target, amount: 0, status: `Арест имущества снят` });
        alert(`🔓 Арест со счета ${target} снят.`);
        document.getElementById('admin-arrest-account').value = "";
        updateUI();
    }
}

async function createMultiSplitCode() {
    if (userAccountData.is_arrested) return alert("🔒 Операция заблокирована! Ваше имущество арестовано.");
    const poolInput = document.getElementById('multi-total-pool');
    const limitInput = document.getElementById('multi-activations-limit');
    const reasonInput = document.getElementById('multi-custom-reason');
    const totalPoolInUserCurrency = parseFloat(poolInput.value);
    const limit = parseInt(limitInput.value);
    let reason = reasonInput.value.trim() || "Конверт с монетами";

    if (isNaN(totalPoolInUserCurrency) || totalPoolInUserCurrency <= 0 || isNaN(limit) || limit <= 0) return alert("Неверные параметры пула!");

    const fresh = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "GET");
    if(fresh) userAccountData = fresh[0];

    let userBase = userAccountData.base_currency || "coins";
    let totalPoolInCoins = totalPoolInUserCurrency * RATES[userBase];
    if (myAccountNumber !== "77777777" && totalPoolInCoins > userAccountData.balance) return alert("Недостаточно средств!");

    const amountPerActivationInCoins = Math.floor(totalPoolInCoins / limit);
    if (amountPerActivationInCoins <= 0) return alert("Слишком маленький пул на одну активацию!");

    if (myAccountNumber !== "77777777") {
        await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "PATCH", { balance: userAccountData.balance - totalPoolInCoins });
    }

    let txId = generateUniqueTxId();
    let cryptedReason = encodeTextToDigits(reason);
    let secureToken = `TX-${txId}-MULTI-${limit}-${amountPerActivationInCoins}-${cryptedReason}`;

    await supabaseFetch("multicodes", "POST", { tx_id: txId, claimed_users: [] });
    await supabaseFetch("logs", "POST", { tx_id: txId, from_user: myAccountNumber, to_user: "MULTI", amount: totalPoolInUserCurrency, status: `Универсальный конверт: ${reason}` });

    await manualCloudRefresh();
    document.getElementById('chek-text-multi').innerText = secureToken;
    document.getElementById('chek-box-multi').style.display = "block";
    generateQR("qr-multi-container", secureToken);

    poolInput.value = ""; limitInput.value = ""; reasonInput.value = "";
}

async function redeemSecureCode() {
    if (userAccountData.is_arrested) return alert("🔒 Операция заблокирована! Ваше имущество арестовано.");
    let inputField = document.getElementById('coupon-code-input');
    let token = inputField.value.trim().replace(/\s+/g, '');
    if (!token.startsWith("TX-")) return alert("Неверный формат!");
    
    let parts = token.split("-");
    if (parts.length < 6) return alert("Код поврежден!");
    
    let txId = parts[1];
    let senderAccount = parts[2].trim().replace(/\s+/g, ''); 
    let receiverAccount = parts[3].trim().replace(/\s+/g, ''); 
    let amountInCoins = parseInt(parts[4]); 
    let encryptedReason = parts[5].trim().replace(/\s+/g, ''); 
    
    let userBase = userAccountData.base_currency || "coins";
    let decryptedReason = decodeDigitsToText(encryptedReason);
    let amountInUserCurrency = amountInCoins / RATES[userBase];

    if (senderAccount !== "MULTI") {
        if (receiverAccount !== myAccountNumber) return alert("🔒 Ошибка! Этот код или ордер выписан на другой счет.");
        
        const usedCheck = await supabaseFetch(`logs?tx_id=eq.${txId}&status=ilike.*Зачислено*`, "GET");
        const usedDebitCheck = await supabaseFetch(`logs?tx_id=eq.${txId}&status=ilike.*Штраф списан*`, "GET");
        if ((usedCheck && usedCheck.length > 0) || (usedDebitCheck && usedDebitCheck.length > 0)) return alert("Этот код уже был активирован ранее!");

        const fresh = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "GET");
        if(fresh) userAccountData = fresh[0];

        if (senderAccount === "DEBIT") {
            await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "PATCH", { balance: userAccountData.balance - amountInCoins });
            await supabaseFetch("logs", "POST", { tx_id: txId, from_user: myAccountNumber, to_user: "00000000", amount: amountInUserCurrency, status: `Штраф списан за: ${decryptedReason}` });
            
            let finalAccountBalance = (userAccountData.balance - amountInCoins) / RATES[userBase];
            alert(`⚖️ Вам был выписан ордер на штраф!\n\n• Причина: ${decryptedReason}\n• Списано со счета: ${amountInUserCurrency.toFixed(2)} ${userBase.toUpperCase()}\n\n💰 Твой итоговый счет: ${finalAccountBalance.toFixed(2)} ${userBase.toUpperCase()}`);
        } else {
            await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "PATCH", { balance: userAccountData.balance + amountInCoins });
            await supabaseFetch("logs", "POST", { tx_id: txId, from_user: senderAccount, to_user: myAccountNumber, amount: amountInUserCurrency, status: `Зачислено: ${decryptedReason}` });
            alert(`💰 Получено зачисление (+${amountInUserCurrency.toFixed(2)} ${userBase.toUpperCase()})!`);
        }
    } else {
        let limit = parseInt(receiverAccount);
        const poolCheck = await supabaseFetch(`multicodes?tx_id=eq.${txId}`, "GET");
        if (!poolCheck || poolCheck.length === 0) return alert("Конверт не найден на сервере!");
        
        let claimedUsers = poolCheck[0].claimed_users || [];
        if (claimedUsers.includes(myAccountNumber)) return alert("🔒 Вы уже забрали свою долю из этого конверта!");
        if (claimedUsers.length >= limit) return alert("🚫 Все доступные лимиты активации этого конверта исчерпаны!");

        claimedUsers.push(myAccountNumber);
        await supabaseFetch(`multicodes?tx_id=eq.${txId}`, "PATCH", { claimed_users: claimedUsers });

        const fresh = await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "GET");
        if(fresh) userAccountData = fresh[0];

        await supabaseFetch(`accounts?number=eq.${myAccountNumber}`, "PATCH", { balance: userAccountData.balance + amountInCoins });
        await supabaseFetch("logs", "POST", { tx_id: txId, from_user: "MULTI", to_user: myAccountNumber, amount: amountInUserCurrency, status: `Доля конверта: ${decryptedReason}` });
        alert(`🎁 Вы забрали свою часть пула (+${amountInUserCurrency.toFixed(2)} ${userBase.toUpperCase()})!`);
    }
    inputField.value = "";
    await manualCloudRefresh();
}

async function createAccount() {
    let deviceFingerprint = safeGetItem('myRegisteredBankNumber');
    if (deviceFingerprint) {
        alert(`🚫 Отказано в регистрации!\n\nНа этом устройстве уже создан расчетный счет № ${deviceFingerprint}. Мульти-аккаунты запрещены.`);
        return;
    }

    let name = document.getElementById('reg-name').value.trim();
    let cvv = document.getElementById('reg-custom-cvv').value.trim();
    let selectedCur = document.getElementById('reg-base-currency').value;
    
    if (!name || !cvv) return alert("Заполните все поля!");
    if (cvv.length < 3 || cvv.length > 4) return alert("CVV должен состоять из 3-4 цифр!");

    const nameCheck = await supabaseFetch(`accounts?owner=ilike.${name}`, "GET");
    if (nameCheck && nameCheck.length > 0) return alert(`🚫 Ошибка! Владелец с именем "${name}" уже зарегистрирован.`);

    let newNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    const newAcc = await supabaseFetch("accounts", "POST", {
        number: newNum, owner: name, base_currency: selectedCur, balance: 0,
        cvv: cvv, formatted_number: newNum.substring(0,4) + " " + newNum.substring(4,8)
    });

    if (newAcc) {
        safeSetItem('myRegisteredBankNumber', newNum);
        safeSetItem('activeBankSession', newNum);
        myAccountNumber = newNum;
        userAccountData = newAcc[0];
        
        alert(`Счет успешно открыт! Номер счета: ${newNum}\n\nВы автоматически вошли в личный кабинет.`);
        document.getElementById('register-zone').style.display = "none";
        document.getElementById('account-zone').style.display = "block";
        autoLogin(newNum);
    }
}

function switchZone(zone) {
    if (zone === 'register') {
        let deviceFingerprint = safeGetItem('myRegisteredBankNumber');
        if (deviceFingerprint) return alert(`🚫 Доступ заблокирован!\n\nНа этом устройстве уже есть аккаунт № ${deviceFingerprint}.`);
        let generatedNum = Math.floor(10000000 + Math.random() * 90000000).toString();
        document.getElementById('reg-generated-number').innerText = generatedNum.substring(0,4) + " " + generatedNum.substring(4,8);
        document.getElementById('login-zone').style.display = "none";
        document.getElementById('register-zone').style.display = "block";
    } else {
        document.getElementById('register-zone').style.display = "none";
        document.getElementById('login-zone').style.display = "block";
    }
}

async function updateUI() {
    if (!userAccountData) return;
    let baseCurr = userAccountData.base_currency || "coins";
    let visualBalance = userAccountData.balance / RATES[baseCurr];
    
    document.getElementById('main-balance-render').innerText = `${visualBalance.toFixed(2)} ${baseCurr.toUpperCase()}`;
    document.getElementById('balance-coins').innerText = userAccountData.balance.toFixed(2);
    document.getElementById('balance-usd').innerText = (userAccountData.usd || 0).toFixed(2);
    document.getElementById('balance-eur').innerText = (userAccountData.eur || 0).toFixed(2);
    document.getElementById('balance-cny').innerText = (userAccountData.cny || 0).toFixed(2);
    document.getElementById('balance-ton').innerText = (userAccountData.ton || 0).toFixed(2);
    document.getElementById('balance-btc').innerText = (userAccountData.btc || 0).toFixed(5);
    document.getElementById('balance-saakovska').innerText = (userAccountData.saakovska || 0).toFixed(4);

    const arrestBanner = document.getElementById('arrest-banner');
    const arrestText = document.getElementById('arrest-banner-text');
    const bankingActions = document.getElementById('banking-active-actions');
    const currencyChangeSection = document.getElementById('currency-change-section');

    if (userAccountData.is_arrested) {
        arrestText.innerText = `Ваше имущество арестовано, причиной стало это: ${userAccountData.arrest_reason}`;
        arrestBanner.style.display = "block"; bankingActions.style.display = "none"; currencyChangeSection.style.display = "none"; 
    } else {
        arrestBanner.style.display = "none"; bankingActions.style.display = "block"; currencyChangeSection.style.display = "block";
    }

    const container = document.getElementById('history-list-container');
    if (!container) return;
    container.innerHTML = "";
    
    let query = "logs?order=created_at.desc&limit=40";
    if (myAccountNumber !== "77777777") {
        query += `&or=(from_user.eq.${myAccountNumber},to_user.eq.${myAccountNumber})`;
    }
    
    const logs = await supabaseFetch(query, "GET");
    let searchQuery = document.getElementById('search-tx-id').value.trim().toLowerCase();
    let hasLogs = false;

    if (logs && logs.length > 0) {
        logs.forEach(log => {
            if (searchQuery !== "" && !log.tx_id.toLowerCase().includes(searchQuery)) return;
            hasLogs = true;
            let item = document.createElement('div');
            item.className = "history-item";
            let isDebitTx = log.status.includes('Штраф') || log.status.includes('ордер') || log.status.includes('списан') || log.status.includes('Арест');
            let isExchange = log.to_user === "EXCHANGE";
            let color = "#10b981"; if (isDebitTx) color = "#ef4444"; if (isExchange) color = "#3b82f6";
            
            let timeStr = new Date(log.created_at).toLocaleTimeString();

            item.innerHTML = `
                [${timeStr}] <span class="tx-id">Транзакция: #${log.tx_id}</span><br>
                ${isExchange ? `Действие: <b>${log.status}</b>` : `Отправитель: <b>${log.from_user}</b> -> Получатель: <b>${log.to_user}</b><br>Сумма: <b style="color:${color};">${log.amount} ед.</b> | Статус: <i>${log.status}</i>`}
            `;
            container.appendChild(item);
        });
    }
    if (!hasLogs) container.innerHTML = "<p style='color:#7f8c8d; font-size:13px;'>Транзакции не найдены.</p>";
}