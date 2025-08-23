# Тестирование Process Manager

Этот проект использует Jest для тестирования с максимальным покрытием кода.

## Структура тестов

```
tests/
├── setup.ts                    # Настройка тестов и моки
├── process-manager.test.ts     # Основные тесты ProcessManager
├── file-operations.test.ts     # Тесты файловых операций
├── archive-operations.test.ts  # Тесты архивирования
├── types.test.ts              # Тесты типов и интерфейсов
├── integration.test.ts        # Интеграционные тесты
└── README.md                  # Эта документация
```

## Запуск тестов

### Основные команды

```bash
# Запуск всех тестов
npm test

# Запуск тестов в режиме наблюдения
npm run test:watch

# Запуск тестов с покрытием
npm run test:coverage

# Запуск тестов с подробным выводом
npm run test:verbose
```

### Запуск конкретных тестов

```bash
# Запуск конкретного файла тестов
npm test -- tests/process-manager.test.ts

# Запуск тестов по паттерну
npm test -- --testNamePattern="createProcess"

# Запуск тестов конкретной группы
npm test -- --testNamePattern="ProcessManager.*createProcess"
```

## Покрытие кода

Проект настроен на достижение минимум 90% покрытия по всем метрикам:

- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%
- **Statements**: 90%

### Просмотр покрытия

После запуска `npm run test:coverage` отчеты будут доступны в:

- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **Console**: Вывод в терминале

## Моки и зависимости

### Основные моки

- **PM2**: Мокается для изоляции тестов от реального PM2
- **fs**: Файловая система мокается для тестирования файловых операций
- **path**: Модуль путей мокается для предсказуемости
- **archiver**: Архиватор мокается для тестирования zip-операций

### Настройка моков

```typescript
// В setup.ts
jest.mock('pm2', () => ({
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  // ... другие методы
}));
```

## Типы тестов

### 1. Unit тесты (`process-manager.test.ts`)

Тестируют отдельные методы класса ProcessManager:

- Конструктор и инициализация
- Управление процессами (создание, запуск, остановка, удаление)
- Получение информации о процессах
- Утилитарные методы

### 2. Файловые операции (`file-operations.test.ts`)

Тестируют работу с файлами результатов:

- Сохранение файлов
- Чтение списка файлов
- Удаление файлов
- Очистка результатов
- Статистика

### 3. Архивирование (`archive-operations.test.ts`)

Тестируют создание zip-архивов:

- Архивирование результатов одного процесса
- Архивирование всех результатов
- Различные опции архивирования
- Обработка ошибок

### 4. Типы (`types.test.ts`)

Проверяют корректность TypeScript типов:

- Совместимость интерфейсов
- Валидация типов
- Граничные случаи
- Специальные символы

### 5. Интеграционные тесты (`integration.test.ts`)

Тестируют взаимодействие компонентов:

- Полный жизненный цикл процесса
- Управление множественными процессами
- Файловые операции между процессами
- Обработка ошибок
- Производительность и масштабируемость

## Написание новых тестов

### Структура теста

```typescript
describe('ClassName', () => {
  let instance: ClassName;

  beforeEach(() => {
    // Настройка перед каждым тестом
    instance = new ClassName();
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something when condition', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await instance.methodName(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error gracefully', async () => {
      // Arrange
      const error = new Error('Test error');
      jest.spyOn(instance, 'dependency').mockRejectedValue(error);
      
      // Act & Assert
      await expect(instance.methodName()).rejects.toThrow('Test error');
    });
  });
});
```

### Лучшие практики

1. **Изоляция**: Каждый тест должен быть независимым
2. **Моки**: Используйте моки для внешних зависимостей
3. **Очистка**: Очищайте моки после каждого теста
4. **Именование**: Используйте описательные имена тестов
5. **Покрытие**: Стремитесь к 100% покрытию критических путей

### Тестирование асинхронного кода

```typescript
it('should handle async operation', async () => {
  // Для Promise.resolve
  await expect(asyncFunction()).resolves.toBe('success');
  
  // Для Promise.reject
  await expect(asyncFunction()).rejects.toThrow('error');
  
  // Для проверки вызова
  expect(mockFunction).toHaveBeenCalledWith('expected');
});
```

### Тестирование ошибок

```typescript
it('should handle specific error', () => {
  // Проверка выброса ошибки
  expect(() => {
    functionThatThrows();
  }).toThrow('Expected error message');
  
  // Проверка типа ошибки
  expect(() => {
    functionThatThrows();
  }).toThrow(Error);
});
```

## Отладка тестов

### Включение логирования

```typescript
// В тесте
console.log('Debug info:', variable);

// В Jest конфиге
verbose: true
```

### Запуск одного теста

```typescript
// Временно измените it на it.only
it.only('should test this specific case', () => {
  // Только этот тест будет запущен
});
```

### Пропуск теста

```typescript
// Временно пропустите тест
it.skip('should be implemented later', () => {
  // Этот тест будет пропущен
});
```

## CI/CD интеграция

### GitHub Actions

```yaml
- name: Run tests
  run: npm run test:coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Проверка покрытия

```bash
# Проверка минимального покрытия
npm run test:coverage -- --coverageThreshold='{"global":{"lines":90}}'
```

## Troubleshooting

### Частые проблемы

1. **Моки не работают**: Убедитесь, что моки определены в `setup.ts`
2. **Тесты падают**: Проверьте, что все зависимости замоканы
3. **Покрытие низкое**: Добавьте тесты для недостающих веток кода
4. **Асинхронные тесты**: Используйте `async/await` и правильные матчеры

### Полезные команды

```bash
# Очистка кэша Jest
npm test -- --clearCache

# Запуск с отладкой
npm test -- --verbose --detectOpenHandles

# Проверка конфигурации
npm test -- --showConfig
```

## Дополнительные ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
