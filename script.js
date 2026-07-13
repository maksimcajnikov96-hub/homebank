const URL = "https://api.jsonbin.io/v3/b/66184a7eacd3cb34a83696fb";
const KEY = "$2b$10$P1W7p2S4v9zG1u.vA7vTeO6HwNf02Bq2V3sW9Xh7h1gXJ9yB7k8D6";
const RATES = { coins: 1, usd: 67.7, eur: 76.6, cny: 13, ton: 113, btc: 1000000 };

let db = null;

async function sync(isPush = false, newData = null) {
    try {
        if (isPush) {
            await fetch(URL, { method: "PUT", headers: { "Content-Type": "application/json", "X-Master-Key": KEY }, body: JSON.stringify(newData) });
            db = newData;
        } else {
            const res = await fetch(URL + "/latest", { headers: { "X-Master-Key": KEY } });
            db = (await res.json()).record;
        }
        updateUI();
    } catch (e) { alert("Ошибка сети"); }
}

async function transferMoney() {
    let target = document.getElementById('target-account-number').value.replace(/\s+/g, '');
    let amount = parseFloat(document.getElementById('transfer-amount').value);
    let cur = document.getElementById('transfer-currency').value;
    
    await sync(); // Скачать актуальное
    let sender = db.accounts[myAccountNumber];
    let cost = (myAccountNumber === "77777777") ? 0 : (amount * RATES[cur]);
    
    if (myAccountNumber !== "77777777" && sender.balance < cost) return alert("Недостаточно!");
    if (myAccountNumber !== "77777777") sender.balance -= cost;
    
    db.logs.unshift({ time: new Date().toLocaleTimeString(), from: myAccountNumber, to: target, amount: amount, status: "Перевод: " + cur });
    await sync(true, db); // Отправить актуальное
    alert("Успешно!");
}

async function executeCurrencyExchange() {
    await sync();
    let user = db.accounts[myAccountNumber];
    let amount = parseFloat(document.getElementById('exchange-input-amount').value);
    let dir = document.getElementById('exchange-direction').value;
    
    // Логика обмена (сокращенная)
    if (dir === "coins_to_usd") { user.balance -= amount; user.usd = (user.usd || 0) + (amount / RATES.usd); }
    // ... здесь можно добавить остальные пары ...
    
    await sync(true, db);
    alert("Обмен выполнен!");
}

function updateUI() {
    if (!db || !db.accounts[myAccountNumber]) return;
    let user = db.accounts[myAccountNumber];
    let base = user.baseCurrency || "coins";
    document.getElementById('main-balance-render').innerText = (user.balance / RATES[base]).toFixed(2) + " " + base.toUpperCase();
}

// Запуск при загрузке
window.addEventListener('DOMContentLoaded', async () => {
    myAccountNumber = localStorage.getItem('activeBankSession');
    await sync();
});