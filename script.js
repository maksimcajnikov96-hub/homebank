let bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || {
    "7777 7777": { owner: "Главный Банкир 👑", balance: 100000, cvv: "8354" }
};

let myAccountNumber = ""; 
const ADMIN_NUMBER = "7777 7777";
let html5QrcodeScanner = null; // Переменная для сканера каметы

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
        nextAccountNumber = generateAccountNumber();
        document.getElementById('reg-generated-number').innerText = nextAccountNumber;
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
    
    bankAccounts[nextAccountNumber] = { owner: name, balance: 0, cvv: customCVV };
    saveToStorage();
    
    alert(`🎉 Аккаунт создан!\nНомер счета: ${nextAccountNumber}`);
    switchZone('login');
    document.getElementById('login-number').value = nextAccountNumber;
    nameInput.value = ""; cvvInput.value = "";
}

function loginAccount() {
    const numberInput = document.getElementById('login-number').value.trim();
    const cvvInput = document.getElementById('login-cvv').value.trim();
    
    bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || bankAccounts;
    
    if (!bankAccounts[ADMIN_NUMBER]) {
        bankAccounts[ADMIN_NUMBER] = { owner: "Главный Банкир 👑", balance: 100000, cvv: "8354" };
        saveToStorage();
    }

    if (!bankAccounts[numberInput] || bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Неверные данные для входа!"); return;
    }
    
    myAccountNumber = numberInput;
    
    if (myAccountNumber === ADMIN_NUMBER) {
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
    
    document.getElementById('display-number').innerText = myAccountNumber;
    document.getElementById('display-cvv').innerText = bankAccounts[myAccountNumber].cvv;
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    // Сбрасываем старые блоки QR при входе
    document.getElementById('qr-block').style.display = "none";
    document.getElementById('qr-container').innerHTML = "";
    
    updateUI();
}

function logout() {
    stopScanner();
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

// СОЗДАНИЕ И ПОКАЗ QR КОДА СВОЕГО СЧЕТА
function toggleQRCode() {
    let qrBlock = document.getElementById('qr-block');
    let qrContainer = document.getElementById('qr-container');
    
    if (qrBlock.style.display === "none") {
        qrContainer.innerHTML = ""; // очищаем
        // Генерируем QR-код, внутри которого просто написан номер нашего счета
        new QRCode(qrContainer, {
            text: myAccountNumber,
            width: 180,
            height: 180
        });
        qrBlock.style.display = "block";
    } else {
        qrBlock.style.display = "none";
    }
}

// СКАНИРОВАНИЕ ЧУЖОГО QR КАМЕРОЙ
function startScanner() {
    document.getElementById('reader').style.display = "block";
    
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    
    html5QrcodeScanner.render((decodedText) => {
        // Действие при успешном сканировании QR-кода:
        document.getElementById('target-account-number').value = decodedText; // подставляем номер счета
        alert(`QR-код распознан! Номер счета получателя: ${decodedText}`);
        stopScanner(); // выключаем камеру
    }, (error) => {
        // Ошибки сканирования в процессе наведения (игнорируем их, пока код ловится фокусом)
    });
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        document.getElementById('reader').style.display = "none";
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
    const targetNumber = document.getElementById('target-account-number').value.trim();
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || bankAccounts;
    
    if (isNaN(amount) || amount <= 0) { alert("Укажите корректную сумму!"); return; }
    if (amount > bankAccounts[myAccountNumber].balance) { alert("В казне не хватает монет!"); return; }
    if (!bankAccounts[targetNumber]) { alert("Счет получателя не найден!"); return; }
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