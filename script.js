const CLOUD_API_URL = "https://api.jsonbin.io/v3/b/66184a7eacd3cb34a83696fb"; 

function getDefaultData() {
    return {
        accounts: {
            "77777777": { owner: "Управление Банка (Казна) 👑", balance: 500000, cvv: "8354", formattedNumber: "7777 7777" },
            "21535477": { owner: "Центральный расчетный счет", balance: 1000, cvv: "111", formattedNumber: "2153 5477" }
        },
        logs: []
    };
}

let bankDatabase = getDefaultData();
let myAccountNumber = ""; 

function safeGetItem(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
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
                safeSetItem('homeBankGlobalData', JSON.stringify(bankDatabase));
            }
        }
    } catch (e) { console.log("Автономный режим"); }
    
    if (!bankDatabase.accounts["77777777"]) bankDatabase.accounts["77777777"] = getDefaultData().accounts["77777777"];
    if (!bankDatabase.accounts["21535477"]) bankDatabase.accounts["21535477"] = getDefaultData().accounts["21535477"];
}

async function saveBankData() {
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
    } catch (e) { console.log("Ошибка сети"); }
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
    
    setInterval(async () => {
        if (myAccountNumber !== "") {
            await loadBankData();
            updateUI();
        }
    }, 3000);
});

function generateAccountNumber() {
    let part1 = Math.floor(1000 + Math.random() * 9000);
    let part2 = Math.floor(1000 + Math.random() * 9000);
    return `${part1} ${part2}`;
}

function switchZone(zone) {
    if (zone === 'register') {
        document.getElementById('login-zone').style.display = 'none';
        document.getElementById('register-zone').style.display = 'block';
        document.getElementById('reg-generated-number').innerText = generateAccountNumber();
    } else {
        document.getElementById('login-zone').style.display = 'block';
        document.getElementById('register-zone').style.display = 'none';
    }
}

async function createAccount() {
    const nameInput = document.getElementById('reg-name').value.trim();
    const cvvInput = document.getElementById('reg-custom-cvv').value.trim().replace(/\s+/g, '');
    
    if (nameInput === "") { alert("Введите ФИО!"); return; }
    if (cvvInput.length < 3 || isNaN(cvvInput)) { alert("CVV должен быть из цифр!"); return; }
    
    let formatted = document.getElementById('reg-generated-number').innerText;
    let cleanNumber = formatted.replace(/\s+/g, '').trim(); 
    
    await loadBankData();
    bankDatabase.accounts[cleanNumber] = { 
        owner: nameInput, balance: 500, cvv: cvvInput, formattedNumber: formatted
    };
    
    addTransactionToLog("SYS", "00000000", cleanNumber, 500, "Регистрация счета");
    await saveBankData();
    
    alert(`🎉 Счет открыт: ${formatted}`);
    switchZone('login');
    document.getElementById('login-number').value = formatted;
    document.getElementById('login-cvv').value = cvvInput;
}

async function loginAccount() {
    let numberInput = document.getElementById('login-number').value.trim().replace(/\s+/g, '');
    let cvvInput = document.getElementById('login-cvv').value.trim().replace(/\s+/g, '');
    
    await loadBankData();

    if (!bankDatabase.accounts[numberInput] || bankDatabase.accounts[numberInput].cvv !== cvvInput) {
        alert("Неверные данные! Проверьте номер счета и CVV."); return;
    }
    
    safeSetItem('activeBankSession', numberInput);
    myAccountNumber = numberInput;
    autoLogin(numberInput);
}

function autoLogin(accountNumber) {
    let user = bankDatabase.accounts[accountNumber];
    if (!user) return;
    document.getElementById('display-name').innerText = user.owner;
    document.getElementById('display-number').innerText = user.formattedNumber || accountNumber;
    document.getElementById('display-cvv').innerText = user.cvv;
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    document.getElementById('generated-chek-box').style.display = "none";
    
    if (myAccountNumber === "77777777") {
        document.getElementById('history-title').innerText = "📋 Глобальный audit транзакций (Казна)";
    } else {
        document.getElementById('history-title').innerText = "📋 История ваших операций";
    }
    updateUI();
}

function logout() {
    try { localStorage.removeItem('activeBankSession'); } catch(e){}
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

// ПЕРЕВОД: АБСОЛЮТНО УСТОЙЧИВ К ЛЮБЫМ ПРОБЕЛАМ ИЗ КЛАВИАТУРЫ ТЕЛЕФОНА
async function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    await loadBankData(); 
    
    if (isNaN(amount) || amount <= 0) { alert("Укажите сумму!"); return; }
    
    // Проверка существования счета по ОЧИЩЕННОМУ номеру
    if (!bankDatabase.accounts[targetNumber]) { 
        alert(`🔒 Ошибка! Расчетный счет [${targetNumber}] не найден в банковской базе.`); 
        return; 
    }
    if (amount > bankDatabase.accounts[myAccountNumber].balance) { alert("Недостаточно средств!"); return; }
    if (targetNumber === myAccountNumber) { alert("Нельзя переводить себе!"); return; }
    
    bankDatabase.accounts[myAccountNumber].balance -= amount;
    
    let txId = Math.floor(1000 + Math.random() * 9000);
    let secureToken = `TX-${txId}-${myAccountNumber}-${targetNumber}-${amount}`;
    
    addTransactionToLog(txId, myAccountNumber, targetNumber, amount, "Чек выпущен (Ожидание)");
    
    await saveBankData(); 
    updateUI();
    
    document.getElementById('chek-text-code').innerText = secureToken;
    document.getElementById('generated-chek-box').style.display = "block";
    
    amountInput.value = ""; document.getElementById('target-account-number').value = "";
    alert(`🎉 Код перевода успешно создан! Передайте его получателю.`);
}

async function redeemSecureCode() {
    let inputField = document.getElementById('coupon-code-input');
    let token = inputField.value.trim().replace(/\s+/g, '');
    
    if (!token.startsWith("TX-")) { alert("Неверный формат кода!"); return; }
    
    let parts = token.split("-");
    if (parts.length !== 5) { alert("Код поврежден!"); return; }
    
    let txId = parts[1];
    let senderAccount = parts[2];
    let receiverAccount = parts[3];
    let amount = parseInt(parts[4]);
    
    await loadBankData();

    // ЖЕЛЕЗНАЯ ПРОВЕРКА ПОЛУЧАТЕЛЯ
    if (receiverAccount !== myAccountNumber) {
        alert("🔒 Неверный счет получателя! Данный код выписан для другого расчетного счета. Активация отклонена.");
        return;
    }
    
    let activatedTokens = [];
    try { activatedTokens = JSON.parse(safeGetItem('usedHomeBankTokens') || "[]"); } catch(e){}
    
    if (activatedTokens.includes(txId)) { alert("Этот код уже активирован!"); return; }
    
    bankDatabase.accounts[myAccountNumber].balance += amount;
    
    if (bankDatabase.logs) {
        let currentLog = bankDatabase.logs.find(l => l.txId === txId.toString());
        if (currentLog) {
            currentLog.status = "Успешно зачислено по коду";
        } else {
            addTransactionToLog(txId, senderAccount, myAccountNumber, amount, "Успешно зачислено по коду");
        }
    }
    
    activatedTokens.push(txId);
    safeSetItem('usedHomeBankTokens', JSON.stringify(activatedTokens));
    
    await saveBankData();
    inputField.value = "";
    updateUI();
    
    alert(`💰 Деньги успешно получены (+${amount} 🪙)!`);
}

function addTransactionToLog(txId, fromUser, toUser, amount, statusDescription) {
    if (!bankDatabase.logs) bankDatabase.logs = [];
    let timestamp = new Date().toLocaleTimeString();
    
    let logItem = {
        txId: txId.toString(),
        from: fromUser,
        to: toUser,
        amount: amount,
        status: statusDescription,
        time: timestamp
    };
    
    bankDatabase.logs.unshift(logItem);
}

function updateUI() {
    if (bankDatabase.accounts[myAccountNumber]) {
        document.getElementById('balance').innerText = bankDatabase.accounts[myAccountNumber].balance.toFixed(2);
    }
    
    let container = document.getElementById('history-list-container');
    if (!container) return;
    container.innerHTML = "";
    
    let searchQuery = document.getElementById('search-tx-id').value.trim().replace(/\s+/g, '');
    let hasLogs = false;
    let logs = bankDatabase.logs || [];
    
    logs.forEach(log => {
        if (myAccountNumber === "77777777" || log.from === myAccountNumber || log.to === myAccountNumber) {
            if (searchQuery !== "" && !log.txId.includes(searchQuery)) { return; }
            
            hasLogs = true;
            let item = document.createElement('div');
            item.className = "history-item";
            
            let nameFrom = bankDatabase.accounts[log.from] ? bankDatabase.accounts[log.from].owner : log.from;
            let nameTo = bankDatabase.accounts[log.to] ? bankDatabase.accounts[log.to].owner : log.to;
            
            item.innerHTML = `
                [${log.time}] <span class="tx-id">Транзакция: #${log.txId}</span><br>
                Отправитель: <b>${nameFrom}</b> -> Получатель: <b>${nameTo}</b><br>
                Сумма: <b style="color:#10b981;">${log.amount} 🪙</b> | Статус: <i>${log.status}</i>
            `;
            container.appendChild(item);
        }
    });
    
    if (!hasLogs) {
        container.innerHTML = "<p style='color:#7f8c8d; font-size:13px; margin:5px 0;'>Транзакции не найдены.</p>";
    }
}