// Функция полной и надежной инициализации банка
function initializeBank() {
    let data = localStorage.getItem('homeBankData');
    let bankBase = {};
    
    if (data) {
        try {
            bankBase = JSON.parse(data);
        } catch (e) {
            bankBase = {};
        }
    }
    
    // 1. КЛЮЧ АДМИНИСТРАТОРА (Папы)
    let adminKey = "77777777";
    if (!bankBase[adminKey]) {
        bankBase[adminKey] = {
            owner: "Главный Банкир 👑",
            balance: 100000,
            cvv: "8354",
            formattedNumber: "7777 7777",
            isAdmin: true 
        };
    }
    
    // 2. ЖЕЛЕЗНЫЙ КЛЮЧ ДЛЯ ДОЧКИ "21535477"
    let childKey = "21535477";
    if (!bankBase[childKey]) {
        bankBase[childKey] = {
            owner: "Дочка ✨", 
            balance: 100,      
            cvv: "111",        
            formattedNumber: "2153 5477",
            isAdmin: false
        };
    }
    
    // Всегда сохраняем структуру, чтобы гарантировать её наличие
    localStorage.setItem('homeBankData', JSON.stringify(bankBase));
    return bankBase;
}

let bankAccounts = initializeBank();
let myAccountNumber = ""; 
let html5QrCode = null; 

// Проверка автосохранения сессии при загрузке страницы
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
    
    // Добавление кнопок синхронизации, если их нет
    if (document.getElementById('account-zone')) {
        let syncDiv = document.getElementById('sync-zone-wrapper');
        if (!syncDiv) {
            syncDiv = document.createElement('div');
            syncDiv.id = 'sync-zone-wrapper';
            syncDiv.innerHTML = `
                <br><hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <h4>Облако: Синхронизация между телефонами</h4>
                <button class="btn-purple" onclick="exportBankDatabase()">Показать QR синхронизации 🔄</button>
                <button class="btn-alt" onclick="startSyncScanner()">Сканировать QR синхронизации 📷</button>
                <div id="sync-qr-wrapper" style="display:none; text-align:center; margin-top:15px;">
                    <div id="sync-qr-container" style="display:flex; justify-content:center; padding:10px; background:#fff; border-radius:10px;"></div>
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

// ИСПРАВЛЕННАЯ РЕГИСТРАЦИЯ
function createAccount() {
    const nameInput = document.getElementById('reg-name');
    const cvvInput = document.getElementById('reg-custom-cvv');
    const name = nameInput.value.trim();
    const customCVV = cvvInput.value.trim();
    
    if (name === "") { alert("Пожалуйста, введите имя!"); return; }
    if (customCVV.length !== 3 || isNaN(customCVV)) { alert("Ошибка! Детский CVV код должен состоять из 3 цифр!"); return; }
    
    let formatted = document.getElementById('reg-generated-number').innerText;
    let cleanNumber = formatted.replace(/\s+/g, ''); 
    
    // Сначала подгружаем актуальную базу, чтобы не затереть других пользователей
    bankAccounts = initializeBank();
    
    bankAccounts[cleanNumber] = { 
        owner: name, 
        balance: 0, 
        cvv: customCVV,
        formattedNumber: formatted,
        isAdmin: false
    };
    
    // Сохраняем жестко в localStorage
    saveToStorage();
    
    alert(`🎉 Счет успешно создан!\nНомер счета: ${formatted}\nCVV: ${customCVV}`);
    
    // Переключаем зону и подставляем данные для входа автоматически
    switchZone('login');
    document.getElementById('login-number').value = formatted;
    document.getElementById('login-cvv').value = customCVV;
    
    nameInput.value = ""; cvvInput.value = "";
}

// ИСПРАВЛЕННЫЙ ВХОД
function loginAccount() {
    let numberInput = document.getElementById('login-number').value.trim().replace(/\s+/g, '');
    const cvvInput = document.getElementById('login-cvv').value.trim();
    
    // Подтягиваем базу с устройства, включая только что созданный аккаунт
    bankAccounts = initializeBank();

    if (numberInput === "77777777" && cvvInput === "8354") {
        localStorage.setItem('activeBankSession', '77777777');
        autoLoginAdmin();
        return;
    }

    if (!bankAccounts[numberInput]) {
        alert("Пользователь с таким номером счета не найден! Перепроверьте номер."); 
        return;
    }
    if (bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Неверный CVV код безопасности!"); 
        return;
    }
    
    localStorage.setItem('activeBankSession', numberInput);
    autoLogin(numberInput);
}

function autoLoginAdmin() {
    myAccountNumber = "77777777";
    document.getElementById('display-name').innerText = "Главный Банкир 👑";
    document.getElementById('admin-tag').style.display = "inline-block";
    document.getElementById('admin-deposit-zone').style.display = "block";
    document.getElementById('transfer-title').innerText = "🎁 Выдать монеты на счет ребенка";
    document.getElementById('transfer-btn').innerText = "Начислить монеты за задание ➡️";
    document.getElementById('display-number').innerText = "7777 7777";
    document.getElementById('display-cvv').innerText = "8354";
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    let adminData = localStorage.getItem('admin_balance') || "100000";
    document.getElementById('balance').innerText = adminData;
}

function autoLogin(accountNumber) {
    myAccountNumber = accountNumber.replace(/\s+/g, '');
    let user = bankAccounts[myAccountNumber];
    
    document.getElementById('display-name').innerText = "Привет, " + user.owner + "! 👋";
    document.getElementById('admin-tag').style.display = "none";
    document.getElementById('admin-deposit-zone').style.display = "none";
    document.getElementById('transfer-title').innerText = "💸 Перевод на другой счет";
    document.getElementById('transfer-btn').innerText = "Совершить перевод ➡️";
    document.getElementById('display-number').innerText = user.formattedNumber || accountNumber;
    document.getElementById('display-cvv').innerText = user.cvv;
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    updateUI();
}

function logout() {
    stopScanner();
    localStorage.removeItem('activeBankSession');
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
    document.getElementById('login-number').value = "";
    document.getElementById('login-cvv').value = "";
}

function toggleQRCodeZone() {
    let qrBlock = document.getElementById('qr-block');
    qrBlock.style.display = qrBlock.style.display === "none" ? "block" : "none";
}

function generateQRWithAmount() {
    const amountInput = document.getElementById('qr-requested-amount');
    const amount = parseInt(amountInput.value);
    let qrContainer = document.getElementById('qr-container');
    
    if (isNaN(amount) || amount <= 0) { alert("Введите корректную сумму!"); return; }
    
    qrContainer.innerHTML = "";
    let qrDataString = `${myAccountNumber}|${amount}`;
    
    new QRCode(qrContainer, { text: qrDataString, width: 180, height: 180 });
    document.getElementById('qr-container-wrapper').style.display = "block";
}

function startScanner() {
    const readerElement = document.getElementById('reader');
    readerElement.style.display = "block";
    if (html5QrCode) { stopScanner(); }
    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText) => {
            if (decodedText.startsWith('SYNC|')) { stopScanner(); return; }
            
            bankAccounts = initializeBank();
            if (decodedText.includes('|')) {
                let parts = decodedText.split('|');
                let scanAccountNumber = parts[0].replace(/\s+/g, ''); 
                let scanAmount = parts[1];
                document.getElementById('target-account-number').value = bankAccounts[scanAccountNumber] ? bankAccounts[scanAccountNumber].formattedNumber : scanAccountNumber;
                document.getElementById('transfer-amount').value = scanAmount;
            } else {
                let cleanText = decodedText.replace(/\s+/g, '');
                document.getElementById('target-account-number').value = bankAccounts[cleanText] ? bankAccounts[cleanText].formattedNumber : decodedText;
            }
            stopScanner();
        }, (err) => {}
    ).catch((err) => { alert("Камера недоступна."); });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => { document.getElementById('reader').style.display = "none"; html5QrCode = null; })
        .catch(() => { document.getElementById('reader').style.display = "none"; html5QrCode = null; });
    }
}

function addMoney() {
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount <= 0) { alert("Введите сумму!"); return; }
    
    let currentAdminBalance = parseInt(localStorage.getItem('admin_balance') || "100000");
    currentAdminBalance += amount;
    localStorage.setItem('admin_balance', String(currentAdminBalance));
    document.getElementById('balance').innerText = currentAdminBalance;
    amountInput.value = "";
}

function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = initializeBank();
    if (isNaN(amount) || amount <= 0) { alert("Укажите сумму!"); return; }
    
    if (myAccountNumber === "77777777") {
        let currentAdminBalance = parseInt(localStorage.getItem('admin_balance') || "100000");
        if (amount > currentAdminBalance) { alert("Не хватает монет в казне!"); return; }
        if (!bankAccounts[targetNumber]) { alert("Счет получателя не найден!"); return; }
        
        currentAdminBalance -= amount;
        localStorage.setItem('admin_balance', String(currentAdminBalance));
        document.getElementById('balance').innerText = currentAdminBalance;
    } else {
        if (amount > bankAccounts[myAccountNumber].balance) { alert("Не хватает монет!"); return; }
        if (!bankAccounts[targetNumber]) { alert("Счет получателя не найден!"); return; }
        if (targetNumber === myAccountNumber) { alert("Нельзя переводить себе!"); return; }
        bankAccounts[myAccountNumber].balance -= amount;
    }
    
    bankAccounts[targetNumber].balance += amount;
    saveToStorage(); 
    if (myAccountNumber !== "77777777") { updateUI(); }
    
    amountInput.value = ""; document.getElementById('target-account-number').value = "";
    alert(`Успешно переведено ${amount} монет! 🎉 Если играете с разных телефонов, используйте QR синхронизации внизу страницы!`);
}

function exportBankDatabase() {
    let qrContainer = document.getElementById('sync-qr-container');
    let wrapper = document.getElementById('sync-qr-wrapper');
    qrContainer.innerHTML = "";
    let dataStr = "SYNC|" + localStorage.getItem('homeBankData');
    new QRCode(qrContainer, { text: dataStr, width: 250, height: 250 });
    wrapper.style.display = "block";
    alert("Отсканируйте этот код с другого телефона для переноса данных!");
}

function startSyncScanner() {
    const readerElement = document.getElementById('reader');
    readerElement.style.display = "block";
    if (html5QrCode) { stopScanner(); }
    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText) => {
            if (decodedText.startsWith('SYNC|')) {
                let rawData = decodedText.split('SYNC|')[1];
                localStorage.setItem('homeBankData', rawData);
                bankAccounts = JSON.parse(rawData);
                alert("🎉 Синхронизация успешна!");
                location.reload();
            } else {
                alert("Это не код синхронизации базы!");
            }
            stopScanner();
        }, (err) => {}
    ).catch((err) => { alert("Камера недоступна."); });
}

function updateUI() {
    if (myAccountNumber !== "77777777" && bankAccounts[myAccountNumber]) {
        document.getElementById('balance').innerText = bankAccounts[myAccountNumber].balance;
    }
}