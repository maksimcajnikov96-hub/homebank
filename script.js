// Функция гарантированной инициализации банка
function initializeBank() {
    let data = localStorage.getItem('homeBankData');
    let bankBase = {};
    
    if (data) {
        try { bankBase = JSON.parse(data); } catch (e) { bankBase = {}; }
    }
    
    // 1. АДМИНИСТРАТОР (Папа) — зашит в систему намертво
    let adminKey = "77777777";
    if (!bankBase[adminKey] || bankBase[adminKey].cvv !== "8354") {
        bankBase[adminKey] = {
            owner: "Главный Банкир 👑",
            balance: 100000,
            cvv: "8354",
            formattedNumber: "7777 7777",
            isAdmin: true 
        };
    }
    
    // 2. СЧЕТ ДЛЯ РЕБЕНКА "21535477" — зашит в систему намертво
    let childKey = "21535477";
    if (!bankBase[childKey] || bankBase[childKey].cvv !== "111") {
        bankBase[childKey] = {
            owner: "Дочка ✨", 
            balance: bankBase[childKey] ? bankBase[childKey].balance : 100, 
            cvv: "111",        
            formattedNumber: "2153 5477",
            isAdmin: false
        };
    }
    
    localStorage.setItem('homeBankData', JSON.stringify(bankBase));
    return bankBase;
}

let bankAccounts = initializeBank();
let myAccountNumber = ""; 

window.addEventListener('DOMContentLoaded', () => {
    let savedNumber = localStorage.getItem('activeBankSession');
    if (savedNumber) {
        savedNumber = savedNumber.replace(/\s+/g, '');
        if (savedNumber === "77777777") {
            autoLoginAdmin();
        } else if (bankAccounts[savedNumber]) {
            autoLogin(savedNumber);
        }
    }
    
    // Создаем блок беспроводной синхронизации балансов внизу страницы
    if (document.getElementById('account-zone')) {
        let syncDiv = document.getElementById('sync-zone-wrapper');
        if (!syncDiv) {
            syncDiv = document.createElement('div');
            syncDiv.id = 'sync-zone-wrapper';
            syncDiv.innerHTML = `
                <br><hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <h4>📡 Беспроводная передача монет (Синхронизация)</h4>
                <p style="font-size:13px; color:#7f8c8d; margin-top:0;">Передайте обновленные балансы на другой телефон через QR-код:</p>
                <button class="btn-purple" onclick="exportBankDatabase()">1. Передать монеты (Показать QR) 🔄</button>
                <button class="btn-alt" onclick="startSyncScanner()">2. Принять монеты (Включить Камеру) 📷</button>
                <div id="reader" style="display: none; width: 100%; max-width: 350px; margin: 15px auto; border-radius: 10px; overflow: hidden;"></div>
                <div id="sync-qr-wrapper" style="display:none; text-align:center; margin-top:15px;">
                    <p style="color: #2ecc71; font-weight: bold; font-size: 14px;">QR-код успешно создан!</p>
                    <img id="sync-qr-image" style="margin-top:5px; border:4px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.1); border-radius:10px; max-width:220px; width:100%;" src="" alt="QR синхронизации">
                </div>
            `;
            document.getElementById('account-zone').appendChild(syncDiv);
        }
    }
});

function generateAccountNumber() {
    let part1 = Math.floor(1000 + Math.random() * 9000);
    let part2 = Math.floor(1000 + Math.random() * 9000);
    return `${part1} ${part2}`;
}

function saveToStorage() {
    localStorage.setItem('homeBankData', JSON.stringify(bankAccounts));
}

function switchZone(zone) {
    if (zone === 'register') {
        document.getElementById('login-zone').style.display = 'none';
        document.getElementById('register-zone').style.display = 'block';
        let rawGenerated = generateAccountNumber();
        document.getElementById('reg-generated-number').innerText = rawGenerated;
    } else {
        document.getElementById('login-zone').style.display = 'block';
        document.getElementById('register-zone').style.display = 'none';
    }
}

function createAccount() {
    const nameInput = document.getElementById('reg-name');
    const cvvInput = document.getElementById('reg-custom-cvv');
    const name = nameInput.value.trim();
    const customCVV = cvvInput.value.trim();
    
    if (name === "") { alert("Пожалуйста, введите имя!"); return; }
    if (customCVV.length !== 3 || isNaN(customCVV)) { alert("Ошибка! Детский CVV код должен состоять из 3 цифр!"); return; }
    
    let formatted = document.getElementById('reg-generated-number').innerText;
    let cleanNumber = formatted.replace(/\s+/g, ''); 
    
    bankAccounts = initializeBank();
    bankAccounts[cleanNumber] = { 
        owner: name, balance: 0, cvv: customCVV, formattedNumber: formatted, isAdmin: false
    };
    saveToStorage();
    
    alert(`🎉 Счет успешно создан!\nНомер счета: ${formatted}`);
    switchZone('login');
    document.getElementById('login-number').value = formatted;
    document.getElementById('login-cvv').value = customCVV;
    nameInput.value = ""; cvvInput.value = "";
}

function loginAccount() {
    let numberInput = document.getElementById('login-number').value.trim().replace(/\s+/g, '');
    const cvvInput = document.getElementById('login-cvv').value.trim();
    
    bankAccounts = initializeBank();

    if (numberInput === "77777777" && cvvInput === "8354") {
        localStorage.setItem('activeBankSession', '77777777');
        autoLoginAdmin();
        return;
    }

    if (!bankAccounts[numberInput] || bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Неверные данные для входа!"); return;
    }
    
    localStorage.setItem('activeBankSession', numberInput);
    autoLogin(numberInput);
}

function autoLoginAdmin() {
    myAccountNumber = "77777777";
    bankAccounts = initializeBank();
    document.getElementById('display-name').innerText = "Главный Банкир 👑";
    document.getElementById('admin-tag').style.display = "inline-block";
    document.getElementById('admin-deposit-zone').style.display = "block";
    document.getElementById('display-number').innerText = "7777 7777";
    document.getElementById('display-cvv').innerText = "8354";
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    renderQuickTransferButtons();
    updateUI();
}

function autoLogin(accountNumber) {
    myAccountNumber = accountNumber.replace(/\s+/g, '');
    let user = bankAccounts[myAccountNumber];
    
    document.getElementById('display-name').innerText = "Привет, " + user.owner + "! 👋";
    document.getElementById('admin-tag').style.display = "none";
    document.getElementById('admin-deposit-zone').style.display = "none";
    document.getElementById('display-number').innerText = user.formattedNumber || accountNumber;
    document.getElementById('display-cvv').innerText = user.cvv;
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    renderQuickTransferButtons();
    updateUI();
}

function logout() {
    localStorage.removeItem('activeBankSession');
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

function renderQuickTransferButtons() {
    let listContainer = document.getElementById('users-buttons-list');
    if (!listContainer) return;
    listContainer.innerHTML = "";
    
    let hasUsers = false;
    for (let id in bankAccounts) {
        if (id !== myAccountNumber) { 
            hasUsers = true;
            let user = bankAccounts[id];
            let btn = document.createElement('button');
            btn.className = "quick-user-btn";
            btn.innerHTML = `👤 <b>${user.owner}</b> (Счет: ${user.formattedNumber || id})`;
            btn.onclick = function() {
                document.getElementById('target-account-number').value = user.formattedNumber || id;
                document.getElementById('transfer-amount').focus();
            };
            listContainer.appendChild(btn);
        }
    }
    if (!hasUsers) {
        listContainer.innerHTML = "<p style='color:#7f8c8d; font-size:14px;'>В банке пока нет других счетов.</p>";
    }
}

function addMoney() {
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount <= 0) { alert("Введите сумму!"); return; }
    bankAccounts = initializeBank();
    bankAccounts[myAccountNumber].balance += amount;
    saveToStorage(); updateUI(); amountInput.value = "";
}

function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = initializeBank();
    if (isNaN(amount) || amount <= 0) { alert("Укажите сумму перевода!"); return; }
    if (!bankAccounts[targetNumber]) { alert("Счет получателя не найден в базе банка!"); return; }
    if (amount > bankAccounts[myAccountNumber].balance) { alert("Недостаточно монет на счете!"); return; }
    if (targetNumber === myAccountNumber) { alert("Нельзя переводить монеты самому себе!"); return; }
    
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[targetNumber].balance += amount;
    
    saveToStorage(); updateUI();
    amountInput.value = ""; document.getElementById('target-account-number').value = "";
    
    alert(`🎉 На твоем телефоне успешно переведено ${amount} монет для ${bankAccounts[targetNumber].owner}!\n\n⚠️ ТЕПЕРЬ НАЖМИ КНОПКУ СИНХРОНИЗАЦИИ ВНИЗУ, ЧТОБЫ ОТПРАВИТЬ ДЕНЬГИ НА ЕЁ ТЕЛЕФОН!`);
}

// 1. ОТПРАВКА БАЗЫ (Генерация стабильного QR-кода через открытое API)
function exportBankDatabase() {
    let dataStr = encodeURIComponent("SYNC|" + localStorage.getItem('homeBankData'));
    let qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${dataStr}`;
    
    document.getElementById('sync-qr-image').src = qrApiUrl;
    document.getElementById('sync-qr-wrapper').style.display = "block";
    alert("База данных подготовлена к отправке. Попроси ребенка отсканировать этот QR-код со своего телефона!");
}

// 2. ПРИЕМ БАЗЫ (Включение сканера на телефоне ребенка)
let html5SyncScanner = null;
function startSyncScanner() {
    const readerElement = document.getElementById('reader');
    readerElement.style.display = "block";
    
    if (html5SyncScanner) { html5SyncScanner.clear(); }
    html5SyncScanner = new Html5Qrcode("reader");

    html5SyncScanner.start(
        { facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText) => {
            if (decodedText.startsWith('SYNC|')) {
                let rawData = decodedText.split('SYNC|')[1];
                localStorage.setItem('homeBankData', rawData);
                bankAccounts = JSON.parse(rawData);
                
                alert("🎉 Монеты получены! Баланс твоего кошелька успешно обновлен!");
                
                if (html5SyncScanner) {
                    html5SyncScanner.stop().then(() => {
                        readerElement.style.display = "none";
                        location.reload(); // Перезапуск страницы для обновления цифр баланса
                    });
                }
            } else {
                alert("Это не код синхронизации банка!");
            }
        }, (err) => {}
    ).catch((err) => { alert("Камера недоступна. Дайте разрешение сайту."); readerElement.style.display = "none"; });
}

function updateUI() {
    if (bankAccounts[myAccountNumber]) {
        document.getElementById('balance').innerText = bankAccounts[myAccountNumber].balance;
    }
}