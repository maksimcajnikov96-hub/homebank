// Функция безопасной инициализации банка
function initializeBank() {
    let data = localStorage.getItem('homeBankData');
    if (!data) {
        let bankBase = {};
        // Маскируем создание админ-счета, чтобы его цифр не было видно в коде
        // (70000000 + 7777777) = 77777777. Пароль: (8000 + 354) = 8354
        let adminKey = String(70000000 + 7777777); 
        let adminCVV = String(8000 + 354);
        
        bankBase[adminKey] = {
            owner: "Главный Банкир 👑",
            balance: 100000,
            cvv: adminCVV,
            formattedNumber: "7777 7777",
            isAdmin: true // Скрытый флаг администратора
        };
        localStorage.setItem('homeBankData', JSON.stringify(bankBase));
        return bankBase;
    }
    return JSON.parse(data);
}

let bankAccounts = initializeBank();
let myAccountNumber = ""; 
let html5QrCode = null; 

window.addEventListener('DOMContentLoaded', () => {
    let savedNumber = localStorage.getItem('activeBankSession');
    if (savedNumber) {
        savedNumber = savedNumber.replace(/\s+/g, '');
        if (bankAccounts[savedNumber]) {
            autoLogin(savedNumber);
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
    
    bankAccounts[cleanNumber] = { 
        owner: name, 
        balance: 0, 
        cvv: customCVV,
        formattedNumber: formatted,
        isAdmin: false
    };
    saveToStorage();
    
    alert(`🎉 Аккаунт создан!\nНомер счета: ${formatted}`);
    switchZone('login');
    document.getElementById('login-number').value = formatted;
    nameInput.value = ""; cvvInput.value = "";
}

function loginAccount() {
    let numberInput = document.getElementById('login-number').value.trim().replace(/\s+/g, '');
    const cvvInput = document.getElementById('login-cvv').value.trim();
    
    bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || bankAccounts;

    if (!bankAccounts[numberInput] || bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Неверные данные для входа!"); return;
    }
    
    localStorage.setItem('activeBankSession', numberInput);
    autoLogin(numberInput);
}

function autoLogin(accountNumber) {
    myAccountNumber = accountNumber.replace(/\s+/g, '');
    
    // Проверяем админа не по жесткому номеру, а по скрытому флагу безопасности
    if (bankAccounts[myAccountNumber] && bankAccounts[myAccountNumber].isAdmin === true) {
        document.getElementById('display-name').innerText = bankAccounts[myAccountNumber].owner;
        document.getElementById('admin-tag').style.display = "inline-block";
        document.getElementById('admin-deposit-zone').style.display = "block";
        document.getElementById('transfer-title').innerText = "🎁 Выдать монеты на счет ребенка";
        document.getElementById('transfer-btn').innerText = "Начислить монеты за задание ➡️";
    } else {
        document.getElementById('display-name').innerText = "Привет, " + bankAccounts[myAccountNumber].owner + "! 👋";
        document.getElementById('admin-tag').style.display = "none";
        document.getElementById('admin-deposit-zone').style.display = "none";
        document.getElementById('transfer-title').innerText = "💸 Перевод на другой счет";
        document.getElementById('transfer-btn').innerText = "Совершить перевод ➡️";
    }
    
    document.getElementById('display-number').innerText = bankAccounts[myAccountNumber].formattedNumber || myAccountNumber;
    document.getElementById('display-cvv').innerText = bankAccounts[myAccountNumber].cvv;
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    document.getElementById('qr-block').style.display = "none";
    document.getElementById('qr-container-wrapper').style.display = "none";
    document.getElementById('qr-container').innerHTML = "";
    
    updateUI();
}

function logout() {
    stopScanner();
    localStorage.removeItem('activeBankSession');
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

function toggleQRCodeZone() {
    let qrBlock = document.getElementById('qr-block');
    if (qrBlock.style.display === "none") {
        qrBlock.style.display = "block";
        document.getElementById('qr-container-wrapper').style.display = "none";
        document.getElementById('qr-requested-amount').value = "";
    } else {
        qrBlock.style.display = "none";
    }
}

function generateQRWithAmount() {
    const amountInput = document.getElementById('qr-requested-amount');
    const amount = parseInt(amountInput.value);
    let qrContainer = document.getElementById('qr-container');
    
    if (isNaN(amount) || amount <= 0) {
        alert("Пожалуйста, введите корректную сумму монет!");
        return;
    }
    
    qrContainer.innerHTML = "";
    let qrDataString = `${myAccountNumber}|${amount}`;
    
    new QRCode(qrContainer, {
        text: qrDataString,
        width: 180,
        height: 180
    });
    
    document.getElementById('qr-container-wrapper').style.display = "block";
}

function startScanner() {
    const readerElement = document.getElementById('reader');
    readerElement.style.display = "block";

    if (html5QrCode) { stopScanner(); }
    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            if (decodedText.includes('|')) {
                let parts = decodedText.split('|');
                let scanAccountNumber = parts[0].replace(/\s+/g, ''); 
                let scanAmount = parts[1];
                
                let visualNumber = bankAccounts[scanAccountNumber] ? bankAccounts[scanAccountNumber].formattedNumber : scanAccountNumber;
                
                document.getElementById('target-account-number').value = visualNumber;
                document.getElementById('transfer-amount').value = scanAmount;
                
                alert(`QR-код распознан!\nПолучатель: ${bankAccounts[scanAccountNumber] ? bankAccounts[scanAccountNumber].owner : "Неизвестно"}\nСумма: ${scanAmount} монет`);
            } else {
                let cleanText = decodedText.replace(/\s+/g, '');
                let visualNumber = bankAccounts[cleanText] ? bankAccounts[cleanText].formattedNumber : decodedText;
                document.getElementById('target-account-number').value = visualNumber;
                document.getElementById('transfer-amount').value = "";
                alert(`Распознан номер счета: ${visualNumber}`);
            }
            stopScanner();
        },
        (errorMessage) => {}
    ).catch((err) => {
        console.error(err);
        alert("Не удалось запустить камеру.");
        readerElement.style.display = "none";
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('reader').style.display = "none";
            html5QrCode = null;
        }).catch((err) => {
            document.getElementById('reader').style.display = "none";
            html5QrCode = null;
        });
    }
}

function addMoney() {
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount <= 0) { alert("Введите правильную сумму!"); return; }
    bankAccounts[myAccountNumber].balance += amount;
    saveToStorage(); updateUI(); amountInput.value = "";
}

function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || bankAccounts;
    
    if (isNaN(amount) || amount <= 0) { alert("Укажите корректную сумму!"); return; }
    if (amount > bankAccounts[myAccountNumber].balance) { alert("Не хватает монет!"); return; }
    if (!bankAccounts[targetNumber]) { alert("Счет получателя не найден в базе банка!"); return; }
    if (targetNumber === myAccountNumber) { alert("Нельзя переводить самому себе!"); return; }
    
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[targetNumber].balance += amount;
    
    saveToStorage(); updateUI();
    amountInput.value = ""; document.getElementById('target-account-number').value = "";
    
    alert(`Успешно переведено ${amount} монет! 🎉`);
}

function updateUI() {
    document.getElementById('balance').innerText = bankAccounts[myAccountNumber].balance;
}

window.addEventListener('storage', function(event) {
    if (event.key === 'homeBankData' && myAccountNumber !== "") {
        bankAccounts = JSON.parse(event.newValue);
        updateUI();
    }
});