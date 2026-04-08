---
title: "C# LINQ常用查找操作"
summary: "整理 C# 中最常见的 LINQ 查找、筛选、判定和取值操作，帮助快速选对 API。"
category: "C#"
subcategory: "概念"
tags: ["C#", "LINQ", "查询", "集合"]
date: "2026-03-27"
updatedAt: "2026-03-27"
---

:::summary
这篇文章只聚焦 `LINQ` 里的“查找类操作”，也就是我们最常写的“找一个”“找多个”“判定是否存在”“取第一个或唯一一个”“取最大最小值”这类查询。
:::

## 1. 为什么要区分不同的查找操作

很多人在写 `LINQ` 时，习惯所有场景都用 `Where`，但实际上不同方法表达的语义并不一样：

- 有些场景是“找所有符合条件的数据”
- 有些场景是“只想拿第一个”
- 有些场景是“理论上只允许存在一个”
- 有些场景只是“判断是否存在”

如果方法选错了，代码虽然能跑，但可读性和安全性都会下降。

## 2. 准备一个示例集合

下面的示例统一使用这组数据：

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

List<User> users = new List<User>
{
    new User { Id = 1, Name = "Alice", Age = 22, City = "Shanghai", IsActive = true },
    new User { Id = 2, Name = "Bob", Age = 28, City = "Beijing", IsActive = false },
    new User { Id = 3, Name = "Cindy", Age = 28, City = "Shanghai", IsActive = true },
    new User { Id = 4, Name = "David", Age = 35, City = "Shenzhen", IsActive = true }
};

public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int Age { get; set; }
    public string City { get; set; }
    public bool IsActive { get; set; }
}
```

## 3. 返回多个结果

### 3.1 `Where`：筛选所有符合条件的数据

`Where` 用来返回一个结果集合，适合“查多个”场景。

```csharp
List<User> shanghaiUsers = users
    .Where(user => user.City == "Shanghai")
    .ToList();
```

适用场景：

- 查询某一类全部数据
- 后续还要继续链式操作
- 明确知道结果可能有多条

注意点：

- `Where` 返回的是集合，不是单个对象
- 如果最终要得到 `List<T>`，记得补 `ToList()`

### 3.2 `Take`：只取前几个结果

如果你先筛选，再只想要前几条，可以配合 `Take`。

```csharp
List<User> firstTwoActiveUsers = users
    .Where(user => user.IsActive)
    .Take(2)
    .ToList();
```

常见场景：

- 首页展示前 N 条
- 只想看部分结果

## 4. 返回单个结果

### 4.1 `First`：取第一个符合条件的元素

如果你确定一定能找到元素，并且只关心第一条，可以用 `First`。

```csharp
User firstAdultUser = users.First(user => user.Age >= 18);
```

特点：

- 找不到时会抛异常
- 适合“数据必然存在”的场景

### 4.2 `FirstOrDefault`：取第一个，找不到时返回默认值

这是实际开发里更常用的方法。

```csharp
User targetUser = users.FirstOrDefault(user => user.Name == "Eric");
```

如果没找到：

- 引用类型返回 `null`
- 值类型返回默认值，例如 `0`

推荐做法：

```csharp
User targetUser = users.FirstOrDefault(user => user.Name == "Eric");

if (targetUser == null)
{
    Console.WriteLine("未找到用户");
}
```

### 4.3 `Last` 与 `LastOrDefault`

如果你关心的是最后一个元素，可以用这两个方法。

```csharp
User lastActiveUser = users.Last(user => user.IsActive);
User lastShanghaiUser = users.LastOrDefault(user => user.City == "Shanghai");
```

使用场景：

- 日志列表中取最后一条
- 有顺序含义的数据中取尾部元素

注意点：

- 只有在集合顺序本身有意义时才适合使用

### 4.4 `Single`：必须且只能有一个

`Single` 的语义最强，它要求结果必须恰好一条。

```csharp
User onlyUser = users.Single(user => user.Id == 1);
```

它在两种情况下都会抛异常：

- 没有找到
- 找到多条

适用场景：

- 按主键查找
- 按唯一约束字段查找

### 4.5 `SingleOrDefault`：允许没有，但不允许重复

如果业务上允许查不到，但一旦查到就必须只有一条，可以用它。

```csharp
User onlyShanghaiManager = users.SingleOrDefault(user => user.Name == "Manager");
```

语义上可以理解成：

- 0 条，没问题
- 1 条，没问题
- 多于 1 条，说明数据不符合预期，直接报错

:::info 选择建议
如果你只是“想拿一个”，优先考虑 `FirstOrDefault`。  
如果你是在表达“这个条件理论上必须唯一”，优先考虑 `Single` 或 `SingleOrDefault`。
:::

## 5. 判定是否存在

### 5.1 `Any`：判断是否至少存在一条

如果你只是想知道有没有，不要先 `Where` 再 `Count`，直接用 `Any`。

```csharp
bool hasShanghaiUser = users.Any(user => user.City == "Shanghai");
```

优点：

- 语义明确
- 性能通常更好
- 一旦找到一条就可以提前结束

不推荐写法：

```csharp
bool hasShanghaiUser = users.Where(user => user.City == "Shanghai").Count() > 0;
```

### 5.2 `All`：判断是否全部满足条件

`All` 用于判断集合中的所有元素是否都满足条件。

```csharp
bool allAdults = users.All(user => user.Age >= 18);
```

常见场景：

- 检查状态是否全部完成
- 检查配置是否全部有效

## 6. 获取数量

### 6.1 `Count`：统计符合条件的元素数量

```csharp
int shanghaiUserCount = users.Count(user => user.City == "Shanghai");
```

适用场景：

- 想知道一共有多少条
- 用于分页、统计、计数展示

### 6.2 `LongCount`：当数据量可能非常大时使用

`Count` 返回 `int`，而 `LongCount` 返回 `long`。

```csharp
long totalCount = users.LongCount();
```

一般业务开发中不常用，但处理超大集合时会更安全。

## 7. 获取最大值、最小值

### 7.1 `Max` 和 `Min`

如果只是取某个字段的最大值或最小值，可以直接用：

```csharp
int maxAge = users.Max(user => user.Age);
int minAge = users.Min(user => user.Age);
```

### 7.2 `MaxBy` 和 `MinBy`

如果你不是想拿“最大值本身”，而是想拿“拥有最大值的那个对象”，用 `MaxBy` / `MinBy` 更直接。

```csharp
User oldestUser = users.MaxBy(user => user.Age);
User youngestUser = users.MinBy(user => user.Age);
```

它们比下面这种写法更直观：

```csharp
User oldestUser = users.OrderByDescending(user => user.Age).First();
```

:::warning 版本说明
`MaxBy` 和 `MinBy` 是较新的 API，使用前要确认你的 .NET 版本是否支持。
:::

## 8. 按键快速查找

### 8.1 `ToDictionary`：先转字典，再高频查找

如果你要按某个键频繁查找，不要每次都对列表做 `FirstOrDefault`，更适合先转成字典。

```csharp
Dictionary<int, User> userMap = users.ToDictionary(user => user.Id);

User user = userMap[3];
```

适用场景：

- 初始化后会被大量读取
- 按主键反复查找

注意点：

- key 必须唯一，否则会抛异常

### 8.2 `ToLookup`：一个键对应多个结果

如果一个 key 下面可能对应多条数据，用 `ToLookup`。

```csharp
ILookup<string, User> cityLookup = users.ToLookup(user => user.City);

IEnumerable<User> shanghaiUsers = cityLookup["Shanghai"];
```

适用场景：

- 按城市、类型、状态分桶查询
- 一个 key 对应多个元素

## 9. 常见写法对比

### 9.1 找一个用户

```csharp
User user = users.FirstOrDefault(item => item.Id == 2);
```

适合：

- 只需要一个结果
- 查不到也能接受

### 9.2 判断是否存在激活用户

```csharp
bool hasActiveUser = users.Any(item => item.IsActive);
```

适合：

- 只关心有没有

### 9.3 找全部上海用户

```csharp
List<User> result = users
    .Where(item => item.City == "Shanghai")
    .ToList();
```

适合：

- 需要完整结果集

### 9.4 查找唯一用户

```csharp
User user = users.Single(item => item.Id == 1);
```

适合：

- 业务上明确保证唯一

## 10. 实战中的选择建议

### 10.1 只判断存在时优先用 `Any`

不要为了判断有没有而去 `Count() > 0`。

### 10.2 只拿第一条时优先用 `FirstOrDefault`

它通常是最稳妥的默认选择。

### 10.3 明确表达唯一性时用 `Single`

这样代码会把你的业务约束直接写出来。

### 10.4 高频按键查询时转成字典

如果一段逻辑里反复按 `Id` 查找，先 `ToDictionary` 往往更合适。

### 10.5 不要滥用 `Where(...).FirstOrDefault()`

下面这种写法可以简化：

```csharp
User user = users.Where(item => item.IsActive).FirstOrDefault();
```

更推荐直接写：

```csharp
User user = users.FirstOrDefault(item => item.IsActive);
```

## 11. 总结

LINQ 查找类操作可以简单记成下面几组：

- 找多个：`Where`
- 找第一个：`First` / `FirstOrDefault`
- 找最后一个：`Last` / `LastOrDefault`
- 找唯一一个：`Single` / `SingleOrDefault`
- 判断存在：`Any`
- 判断全部满足：`All`
- 统计数量：`Count` / `LongCount`
- 取极值：`Max` / `Min` / `MaxBy` / `MinBy`
- 高效按键查找：`ToDictionary` / `ToLookup`

真正写代码时，不只是“会用”，更重要的是让方法名本身表达你的业务语义。  
当你选对了方法，代码会更清晰，也更不容易埋下隐藏问题。
