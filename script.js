function initializeBank() {
    let data = localStorage.getItem('homeBankData');
    let bankBase = {};
    
    if (data) {
        try { bankBase = JSON.parse(data); } catch (e) { bankBase = {}; }
    }
    
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
    
    localStorage.setItem('homeBankData', JSON.stringify(bankBase));
    return bankBase;
}

let bankAccounts = initializeBank();
let myAccountNumber = ""; 
let html5QrCode = null; 

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
                    <img id="sync-qr-image" style="margin-top:10px; border:4px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.1); border-radius:10px; max-width:220px; width:100%;" src="" alt="QR синхронизации">
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
    document.getElementById('transfer-title').innerText = "🎁 Выдать монеты на счет ребенка";
    document.getElementById('transfer-btn').innerText = "Начислить монеты за задание ➡️";
    document.getElementById('display-number').innerText = "7777 7777";
    document.getElementById('display-cvv').innerText = "8354";
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    document.getElementById('qr-request-zone').style.display = "none";
    updateUI();
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
    
    document.getElementById('qr-request-zone').style.display = "block";
    document.getElementById('qr-container-wrapper').style.display = "none";
    
    updateUI();
}

function logout() {
    stopScanner();
    localStorage.removeItem('activeBankSession');
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

// НАДЁЖНАЯ ГЕНЕРАЦИЯ КАРТИНКИ QR-КОДА ЧЕРЕЗ GOOGLE / QRSERVER API
function generateQRWithAmount() {
    const amountInput = document.getElementById('qr-requested-amount');
    const amount = parseInt(amountInput.value);
    
    if (isNaN(amount) || amount <= 0) { alert("Введите корректную сумму монет!"); return; }
    
    let qrDataString = encodeURIComponent(`${myAccountNumber}|${amount}`);
    
    // Генерируем ссылку на картинку QR-кода
    let qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrDataString}`;
    
    // Подставляем ссылку прямо в картинку на экране
    document.getElementById('qr-image').src = qrApiUrl;
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
    if (!bankAccounts[targetNumber]) { alert("Счет получателя не найден!"); return; }
    if (amount > bankAccounts[myAccountNumber].balance) { alert("Недостаточно монет!"); return; }
    if (targetNumber === myAccountNumber) { alert("Нельзя переводить себе!"); return; }
    
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[targetNumber].balance += amount;
    saveToStorage(); updateUI();
    
    amountInput.value = ""; document.getElementById('target-account-number').value = "";
    alert(`Успешно переведено ${amount} монет! 🎉 Если вы играете на разных телефонах, обновите базу через QR синхронизации.`);
}

// СИНХРОНИЗАЦИЯ ЧЕРЕЗ КАРТИНКУ QR
function exportBankDatabase() {
    let dataStr = encodeURIComponent("SYNC|" + localStorage.getItem('homeBankData'));
    let qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${dataStr}`;
    
    document.getElementById('sync-qr-image').src = qrApiUrl;
    document.getElementById('sync-qr-wrapper').style.display = "block";
    alert("Отсканируйте этот код со второго телефона для полной синхронизации!");
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
            } else { alert("Ошибка кода синхронизации."); }
            stopScanner();
        }, (err) => {}
    ).catch((err) => { alert("Камера недоступна."); });
}

function updateUI() {
    if (bankAccounts[myAccountNumber]) {
        document.getElementById('balance').innerText = bankAccounts[myAccountNumber].balance;
    }
}