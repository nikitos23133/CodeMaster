const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Настройка CORS
const corsOptions = {
    origin: 'http://localhost:8000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};
app.use(cors(corsOptions));

// Обработка OPTIONS
app.options('*', cors(corsOptions), (req, res) => {
    console.log('Обработка OPTIONS');
    res.status(204).send();
});

app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Корневой маршрут
app.get('/', (req, res) => {
    res.send('Сервер CodeMaster работает. Используйте POST /run-csharp, /fix-error, /login.');
});

// Вход (имитация)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'test' && password === '123') {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }
});

// Запуск C# кода
app.post('/run-csharp', async (req, res) => {
    if (!req.body.isAuthenticated) {
        return res.status(401).json({ error: 'Требуется аутентификация' });
    }
    const code = req.body.code;
    const tempDir = path.join(__dirname, 'temp', Date.now().toString());
    const csFile = path.join(tempDir, 'Program.cs');
    const csprojFile = path.join(tempDir, 'Project.csproj');

    try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(csFile, code);
        await fs.writeFile(csprojFile, `
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>net8.0</TargetFramework>
    </PropertyGroup>
</Project>
        `);

        const output = await new Promise((resolve, reject) => {
            exec(`dotnet build ${tempDir} && dotnet run --project ${tempDir}`, (err, stdout, stderr) => {
                if (err || stderr) {
                    reject(new Error(stderr || err.message));
                } else {
                    resolve(stdout);
                }
            });
        });
        res.json({ output });
    } catch (error) {
        res.json({ error: error.message });
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
});

// Исправление ошибок
app.post('/fix-error', async (req, res) => {
    if (!req.body.isAuthenticated) {
        return res.status(401).json({ error: 'Требуется аутентификация' });
    }
    const errorMessage = req.body.errorMessage;
    let fix = 'Неизвестная ошибка. Проверьте синтаксис.';
    if (errorMessage.includes('CS1002')) {
        fix = 'Добавьте точку с запятой (;) в конце строки.';
    } else if (errorMessage.includes('CS0246')) {
        fix = 'Проверьте правильность имени класса или пространства имен.';
    } else if (errorMessage.includes('CS0103')) {
        fix = 'Проверьте, определена ли переменная или метод.';
    }
    res.json({ fix });
});

app.listen(3000, () => console.log('Сервер запущен на порту 3000'));