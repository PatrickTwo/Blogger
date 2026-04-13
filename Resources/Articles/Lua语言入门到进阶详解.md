---
title: "Lua 语言入门到进阶详解"
summary: "面向有 C# 基础、准备做 Unity Lua 热更新的开发者，系统讲解 Lua 的语法、数据结构、函数、模块、元表、面向对象写法与工程实践，并尽量用 C# 对照帮助理解。"
category: "Unity"
subcategory: "热更新"
tags: ["Unity", "Lua", "热更新", "xLua", "脚本语言", "编程基础"]
series: "Unity 框架详解"
order: 5
date: "2026-04-13"
updatedAt: "2026-04-13"
draft: false
---
# Lua 语言入门到进阶详解（面向 Unity 热更新开发者）

## 1. 这篇文章适合谁

这篇文章主要写给这样一类读者：

| 读者画像 | 说明 |
| --- | --- |
| 有 C# 基础 | 已经会变量、函数、类、集合、委托、对象等常见概念 |
| 准备做 Unity 热更新 | 打算接触 xLua、ToLua 或项目里的 Lua 脚本层 |
| 对 Lua 几乎零基础 | 可能只知道它“很轻量、能热更新”，但还不会真正写 |

这篇文章不重点讲 xLua 接入流程，而是重点讲 **Lua 语言本身**。  
因为很多 Unity 开发者接触 Lua 时，真正卡住的不是热更新框架，而是：

1. Lua 变量到底有没有类型。
2. Lua 的 table 到底是数组、字典还是对象。
3. `:` 和 `.` 有什么区别。
4. 为什么 Lua 里函数像值一样到处传。
5. 模块到底怎么组织。
6. 元表、闭包这些概念为什么总在项目代码里出现。

如果这些语言基础没打稳，后面接 xLua、写页面脚本、看旧项目 Lua 代码都会很吃力。

:::abstract 学习目标
读完本文后，你至少应该做到：

1. 能独立阅读和编写中小型 Lua 业务脚本。
2. 能把 C# 常见概念映射到 Lua 里的等价思维方式。
3. 能理解 Unity 热更新项目中常见的 Lua 模块、对象写法和工程组织方式。
:::

## 2. 先建立一个总认知：Lua 和 C# 到底差在哪

如果你是 C# 开发者，先不要急着背语法，先记住下面这张对照表。

| 维度 | C# | Lua |
| --- | --- | --- |
| 类型系统 | 静态类型 | 动态类型 |
| 面向对象 | 原生 class | 没有原生 class，通常用 table + metatable 模拟 |
| 集合类型 | `List`、`Dictionary`、数组等分别存在 | 核心就是 `table`，一套结构覆盖多种用途 |
| 函数 | 方法和委托区分明显 | 函数是一等值，可以像变量一样传递 |
| 空值 | `null` | `nil` |
| 布尔判断 | `false` 和 `null` 为假 | 只有 `false` 和 `nil` 为假 |
| 下标起点 | 通常从 `0` 开始 | 通常从 `1` 开始 |
| 语句结束 | 常写 `;` | 不需要 `;` |

你可以把 Lua 理解成：

**一门语法简单、核心概念少，但表达方式很灵活的动态脚本语言。**

这意味着两件事：

| 好处 | 代价 |
| --- | --- |
| 写起来快、改起来灵活 | 类型约束弱，靠约定和风格保证可维护性 |
| 很适合流程脚本、配置驱动逻辑 | 大项目里更容易出现“写法飘逸”的问题 |

所以 Unity 项目里用 Lua，语言本身不是最难的，**最难的是在灵活性和可维护性之间找到平衡**。

## 3. Lua 的最基础语法

### 3.1 注释

单行注释：

```lua
-- 这是单行注释
```

多行注释：

```lua
--[[
这是多行注释
可以写很多行
]]
```

和 C# 对比：

| C# | Lua |
| --- | --- |
| `//` | `--` |
| `/* */` | `--[[ ]]` |

### 3.2 变量声明

Lua 默认不需要写类型：

```lua
local name = "Player"
local hp = 100
local isDead = false
```

这里的 `local` 非常重要。  
你可以先把它理解成“局部变量声明”。

### 3.3 为什么一定要重视 `local`

如果你不写 `local`：

```lua
score = 10
```

那么 `score` 默认会变成 **全局变量**。

这在小脚本里看起来没什么，但在 Unity 热更新项目中很危险，因为：

1. 全局变量容易污染整个脚本环境。
2. 模块之间容易互相覆盖名字。
3. 调试时不容易判断值从哪来的。

建议直接记住一个规则：

:::warning 最重要的入门规则
Lua 里除了确实想暴露到模块外部的内容，绝大多数变量都应该优先使用 `local`。
:::

### 3.4 基本类型

Lua 常见基础类型如下：

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| `nil` | `local a = nil` | 表示不存在、空 |
| `boolean` | `true` / `false` | 布尔值 |
| `number` | `1`、`3.14` | 数字，Lua 一般不区分 int / float |
| `string` | `"hello"` | 字符串 |
| `function` | `function() end` | 函数本身也是值 |
| `table` | `{}` | 最核心的数据结构 |
| `userdata` | 多见于 C 扩展或引擎桥接 | Unity/xLua 场景里常见于桥接对象 |
| `thread` | 协程相关 | 不是系统线程 |

### 3.5 `nil` 和 C# `null` 的相似与不同

相似点：

1. 都表示“没有值”。
2. 都经常用来表示对象不存在。

不同点：

| 维度 | C# `null` | Lua `nil` |
| --- | --- | --- |
| 变量未赋值 | 引用类型默认可为 `null` | 未定义字段或变量访问结果常是 `nil` |
| 字典移除语义 | 需要显式调用删除 API | 给 table 某个 key 赋 `nil`，本质上就是删除该键 |

这个差异很关键，后面讲 table 时会反复用到。

## 4. 条件判断与循环

### 4.1 `if`

```lua
local hp = 80

if hp <= 0 then
    print("角色死亡")
elseif hp < 30 then
    print("角色残血")
else
    print("角色存活")
end
```

和 C# 对比：

| C# | Lua |
| --- | --- |
| `if (...) { } else if (...) { } else { }` | `if ... then ... elseif ... then ... else ... end` |

### 4.2 Lua 的真假判断

Lua 里只有两个值会被当成假：

1. `false`
2. `nil`

这点和很多语言不同。  
例如下面这些在 Lua 中都算真：

```lua
if 0 then
    print("0 在 Lua 中是真")
end

if "" then
    print("空字符串在 Lua 中也是真")
end
```

这对 C# 开发者来说很容易踩坑，因为在很多语言经验里，`0`、空字符串常常会被当成“假值风格”的东西，但 Lua 不是。

### 4.3 `while`

```lua
local count = 1

while count <= 3 do
    print(count)
    count = count + 1
end
```

### 4.4 数值 `for`

```lua
for i = 1, 5 do
    print(i)
end
```

带步长：

```lua
for i = 1, 10, 2 do
    print(i)
end
```

这里要特别注意：Lua 的数值 `for` 非常常用，尤其适合数组风格 table 遍历。

### 4.5 `for in`

遍历 table 时常配合 `pairs` 和 `ipairs`：

```lua
local data = {100, 200, 300}

for index, value in ipairs(data) do
    print(index, value)
end
```

## 5. 字符串

### 5.1 基本写法

```lua
local name = "Knight"
local message = 'Hello'
```

Lua 支持双引号和单引号，两者都可用。

### 5.2 字符串拼接

```lua
local name = "Knight"
local msg = "Hello, " .. name
print(msg)
```

注意：Lua 不是用 `+` 拼接字符串，而是用 `..`。

这对 C# 开发者非常重要，因为你很容易下意识写成：

```lua
-- 错误思维迁移
local msg = "Hello, " + name
```

### 5.3 多行字符串

```lua
local text = [[
第一行
第二行
第三行
]]
```

这种写法在配置文本、长 Lua 代码段或多行说明里很方便。

## 6. 函数：Lua 最重要的核心能力之一

Lua 里函数不是附属品，而是非常核心的语言能力。

### 6.1 定义函数

```lua
local function Add(a, b)
    return a + b
end
```

也可以写成：

```lua
local Add = function(a, b)
    return a + b
end
```

这两种写法都对，前者更常见、更清晰。

### 6.2 为什么说函数是一等值

因为它可以：

1. 赋值给变量。
2. 作为参数传递。
3. 作为返回值返回。
4. 存进 table。

示例：

```lua
local function SayHello()
    print("hello")
end

local action = SayHello
action()
```

这和 C# 中“方法组 + 委托”的思维有点像，但 Lua 里更自然、更普遍。

### 6.3 多返回值

Lua 一个非常典型的特性就是 **函数可以返回多个值**。

```lua
local function GetPlayerInfo()
    return "Knight", 100, 20
end

local name, hp, level = GetPlayerInfo()
print(name, hp, level)
```

和 C# 对比：

| C# | Lua |
| --- | --- |
| 常用 `out`、元组、对象封装多返回值 | 函数天然支持多个返回值 |

### 6.4 可变参数

```lua
local function PrintAll(...)
    local args = {...}
    for i, value in ipairs(args) do
        print(i, value)
    end
end
```

这里的 `...` 类似 C# 的 `params`，但它本身不是数组，需要你自己收集到 table 里。

### 6.5 闭包

闭包是 Lua 项目里非常常见、也非常重要的能力。

```lua
local function CreateCounter()
    local count = 0

    return function()
        count = count + 1
        return count
    end
end

local counter = CreateCounter()
print(counter()) -- 1
print(counter()) -- 2
```

为什么它能记住 `count`？

因为返回出去的函数，捕获了其定义时所在作用域里的局部变量。  
这就是闭包。

在 Unity 热更新里，闭包常用于：

1. 事件回调。
2. 定时器回调。
3. 延迟执行逻辑。
4. 工厂函数。

:::info 闭包理解建议
如果你有 C# 基础，可以把 Lua 闭包类比成“捕获外部变量的 lambda 表达式”，只是 Lua 里这种写法更常见、更基础。
:::

## 7. Table：Lua 最核心的数据结构

如果只记一个 Lua 语言重点，那就是 `table`。

### 7.1 为什么 table 这么重要

因为 Lua 没有像 C# 那样分得很细的原生数据结构体系。  
你在 C# 里会区分：

1. 数组
2. `List`
3. `Dictionary`
4. 自定义对象
5. 类实例

但在 Lua 里，这些很多都由 `table` 承担。

### 7.2 当数组用

```lua
local numbers = {10, 20, 30}
print(numbers[1])
print(numbers[2])
```

注意这里最容易踩坑的点：

:::warning 下标从 1 开始
Lua 数组风格 table 默认从 `1` 开始，不是从 `0` 开始。
:::

### 7.3 当字典用

```lua
local player = {
    name = "Knight",
    hp = 100,
    level = 5
}

print(player.name)
print(player["hp"])
```

这两种访问方式都行：

| 写法 | 适用场景 |
| --- | --- |
| `player.name` | key 是合法标识符时，写起来更简洁 |
| `player["hp"]` | key 来自变量，或 key 不适合直接点语法时 |

### 7.4 混合用法

Lua table 可以同时混用数组和字典风格：

```lua
local data = {
    "A",
    "B",
    name = "Knight",
    hp = 100
}
```

技术上可行，但业务代码里通常不建议乱混，因为可读性会变差。

### 7.5 新增、修改、删除字段

```lua
local player = {}

player.name = "Knight"
player.hp = 100
player.hp = 80
player.hp = nil
```

最后一行很关键：

`player.hp = nil` 不只是“设为空”，而是 **把这个键删掉**。

### 7.6 遍历

数组风格通常用 `ipairs`：

```lua
local list = {"A", "B", "C"}

for index, value in ipairs(list) do
    print(index, value)
end
```

字典风格通常用 `pairs`：

```lua
local player = {
    name = "Knight",
    hp = 100
}

for key, value in pairs(player) do
    print(key, value)
end
```

### 7.7 `pairs` 和 `ipairs` 区别

| API | 常见用途 | 特点 |
| --- | --- | --- |
| `ipairs` | 遍历连续数组部分 | 通常按 `1` 开始的连续整数下标遍历 |
| `pairs` | 遍历任意键值 | 更通用，但顺序通常不要依赖 |

在 Unity 热更新业务里，如果你需要稳定顺序，最好不要依赖 `pairs` 的遍历顺序。

## 8. 局部作用域与模块思维

### 8.1 局部变量的作用域

```lua
local function Test()
    local hp = 100
    print(hp)
end

print(hp) -- 这里访问不到
```

`local` 变量只在当前作用域有效。  
这是你控制脚本可维护性的第一道防线。

### 8.2 为什么 Lua 项目特别强调“模块化”

因为 Lua 很容易写成满天飞全局变量的状态。  
一旦全局太多，就会出现：

1. 模块边界不清。
2. 变量互相覆盖。
3. 初始化顺序复杂。
4. 热更后状态难追踪。

所以大多数规范化项目，都会把脚本写成“模块返回 table”的形式。

## 9. 模块写法：Unity 热更新项目里最常见

### 9.1 最基础模块

```lua
local MathUtil = {}

function MathUtil.Add(a, b)
    return a + b
end

return MathUtil
```

使用：

```lua
local mathUtil = require("MathUtil")
print(mathUtil.Add(3, 5))
```

### 9.2 为什么要 `return`

因为 `require` 的返回值，就是模块最终导出的东西。  
没有 `return`，外部通常就拿不到模块对象。

### 9.3 `require` 的模块缓存

`require("MathUtil")` 第一次会真正加载执行模块。  
后面再次 `require("MathUtil")`，通常会直接拿缓存结果。

这意味着：

1. 模块初始化逻辑通常只会执行一次。
2. 模块里保存的状态也会被持续保留。

这在 Unity 热更新项目里非常关键，因为很多“脚本状态为什么还在”的问题，本质上都和模块缓存有关。

## 10. `.` 和 `:` 的区别

这是 Lua 入门里最重要的语法点之一。

### 10.1 点语法

```lua
local Player = {}

function Player.PrintName(name)
    print(name)
end

Player.PrintName("Knight")
```

这里函数没有默认 `self`。

### 10.2 冒号语法

```lua
local Player = {}

function Player:PrintName()
    print(self.name)
end
```

这其实是语法糖。  
上面这段等价于：

```lua
function Player.PrintName(self)
    print(self.name)
end
```

调用时：

```lua
local player = { name = "Knight" }
setmetatable(player, { __index = Player })

player:PrintName()
```

等价于：

```lua
player.PrintName(player)
```

### 10.3 什么时候用 `.`，什么时候用 `:`

| 写法 | 常见理解 |
| --- | --- |
| `.` | 普通字段访问，或不依赖实例自身的函数 |
| `:` | 依赖实例自身状态的方法 |

如果你把这个思维映射到 C#：

| C# 类比 | Lua 风格 |
| --- | --- |
| 静态方法 | 更像 `.` |
| 实例方法 | 更像 `:` |

## 11. 用 Lua 模拟“对象”和“类”

Lua 没有原生 class，但项目里照样经常写“对象风格”代码。

### 11.1 最常见写法

```lua
local Player = {}
Player.__index = Player

function Player.New(name, hp)
    local self = setmetatable({}, Player)
    self.name = name
    self.hp = hp
    return self
end

function Player:TakeDamage(value)
    self.hp = self.hp - value
end

function Player:PrintInfo()
    print(self.name, self.hp)
end

return Player
```

使用：

```lua
local Player = require("Player")
local player = Player.New("Knight", 100)
player:TakeDamage(20)
player:PrintInfo()
```

### 11.2 这段代码到底做了什么

| 代码 | 含义 |
| --- | --- |
| `Player = {}` | 定义一个 table，当作“类表” |
| `Player.__index = Player` | 告诉实例查不到字段时，去 `Player` 上找 |
| `setmetatable({}, Player)` | 给实例绑定元表，使其拥有“类方法查找能力” |
| `Player:TakeDamage()` | 实例方法，默认第一个参数是 `self` |

## 12. 元表与元方法：进阶必学

如果说 table 是 Lua 的核心数据结构，那么 metatable 就是 Lua 灵活性的核心来源之一。

### 12.1 元表是什么

你可以先把元表理解成：

**一个 table 的“行为规则表”。**

通过元表，你可以影响：

1. 字段查找规则。
2. 运算符行为。
3. 调用行为。
4. 打印行为。

### 12.2 `__index`

最常见的元方法就是 `__index`。

```lua
local Player = {}
Player.__index = Player
```

当你访问 `player:PrintInfo()` 时：

1. Lua 先在 `player` 自己身上找 `PrintInfo`。
2. 找不到。
3. 看它有没有元表。
4. 如果元表里定义了 `__index`，就按 `__index` 指向继续找。

这就是为什么前面的“类模拟”能成立。

### 12.3 `setmetatable`

`setmetatable(table, metatable)` 的作用就是：给一个 table 指定元表。

```lua
local obj = {}
setmetatable(obj, Player)
```

这不是普通赋值，而是在改变该 table 的行为规则。

### 12.4 常见元方法

| 元方法 | 用途 |
| --- | --- |
| `__index` | 查找缺失字段时的规则 |
| `__newindex` | 给不存在字段赋值时的规则 |
| `__add` | 定义 `+` 行为 |
| `__tostring` | 定义打印字符串表现 |
| `__call` | 让 table 像函数一样被调用 |

### 12.5 为什么 Unity 热更新开发者也要懂元表

因为项目里的很多 Lua“面向对象”写法、本地缓存对象、配置代理对象，本质上都依赖：

1. `setmetatable`
2. `__index`
3. `:` 语法糖

如果你不理解元表，就会觉得这些代码像“黑魔法”；理解后会发现它其实只是规则查找机制。

## 13. 错误处理

### 13.1 `pcall`

Lua 常用 `pcall` 进行保护调用。

```lua
local success, result = pcall(function()
    error("发生错误")
end)

print(success)
print(result)
```

`pcall` 的含义可以理解为：

“安全地执行一个函数，如果报错，不让脚本直接崩掉，而是返回成功标记和错误信息。”

### 13.2 和 C# `try-catch` 的思维对照

| C# | Lua |
| --- | --- |
| `try-catch` | `pcall` / `xpcall` |

Lua 没有像 C# 那样完全对应的 `try-catch-finally` 语法块，所以项目里常见的是用 `pcall` 包一层执行逻辑。

## 14. 协程：不是线程，但很适合流程脚本

### 14.1 先明确：Lua 协程不是系统线程

Lua 的 coroutine 和 C# 的 `Thread` 完全不是一回事。  
它更接近：

1. 可暂停、可恢复的函数执行流。
2. 一种用户态调度的轻量控制方式。

### 14.2 基础示例

```lua
local co = coroutine.create(function()
    print("步骤1")
    coroutine.yield()
    print("步骤2")
end)

coroutine.resume(co)
coroutine.resume(co)
```

执行过程：

1. 第一次 `resume` 运行到 `yield` 暂停。
2. 第二次 `resume` 从暂停点继续。

### 14.3 为什么热更新项目里常看到协程

因为它很适合描述：

1. 剧情流程。
2. 引导流程。
3. 分步骤任务。
4. 简单异步等待逻辑。

如果你有 C# 基础，可以把它粗略类比成“更手动的 `IEnumerator` / 状态机流程控制”，但二者并不完全等价。

## 15. Lua 常见标准库

你不需要一上来全背，但至少要知道有这些常见工具。

| 标准库 | 用途 |
| --- | --- |
| `string` | 字符串处理 |
| `table` | table 操作 |
| `math` | 数学函数 |
| `os` | 时间、系统相关 |
| `coroutine` | 协程 |

### 15.1 `table.insert` 与 `table.remove`

```lua
local list = {10, 20}
table.insert(list, 30)
table.remove(list, 1)
```

这可以类比成对 `List` 的插入和删除，但底层概念不同，不要机械照搬 C# 复杂集合思维。

### 15.2 `string.format`

```lua
local name = "Knight"
local hp = 100
local text = string.format("角色: %s, 血量: %d", name, hp)
print(text)
```

如果你在 C# 里常写字符串插值，那么在 Lua 中 `string.format` 是一个很值得掌握的替代方案。

## 16. 从 C# 视角理解 Lua 的几个思维转变

这一节非常关键，因为很多人不是不会语法，而是思维还停留在 C#。

### 16.1 不要总想找 class

Lua 没有原生 class。  
你应该先接受：

1. 模块可以只是 table。
2. 对象可以只是带元表的 table。
3. 很多逻辑根本不需要“类化”。

也就是说，Lua 更鼓励你先从“数据 + 函数组织”出发，而不是先搭 class 结构。

### 16.2 不要过度追求强类型写法

Lua 是动态语言。  
如果你强行把所有东西都写成 C# 式重封装，通常会导致：

1. 代码变啰嗦。
2. 模块层级过深。
3. 语言优势发挥不出来。

### 16.3 但也不能完全放飞

动态语言不是随便写。  
在 Unity 热更新项目里，更应该强调：

| 约束点 | 目的 |
| --- | --- |
| 模块命名统一 | 易于查找和维护 |
| `local` 优先 | 防止全局污染 |
| 页面/控制器结构统一 | 降低团队理解成本 |
| 服务边界清晰 | 减少 Lua 与 Unity 强耦合 |

:::warning 架构提醒
如果一个 Unity Lua 项目里的脚本既没有统一模块结构，也没有统一对象写法，还到处读写全局变量，那么后期维护成本通常会非常高。  
这不是 Lua 天生混乱，而是项目约束没有建立起来。
:::

## 17. Unity 热更新项目里最常见的 Lua 代码组织方式

### 17.1 常见目录思路

```text
Lua/
  Main.lua
  Common/
  UI/
  Battle/
  Config/
  Utils/
```

### 17.2 常见模块职责

| 目录 | 常见职责 |
| --- | --- |
| `Main` | 总入口 |
| `Common` | 通用常量、基础方法 |
| `UI` | 页面逻辑 |
| `Battle` | 战斗规则和流程 |
| `Config` | 配置读取、解析、映射 |
| `Utils` | 纯工具函数 |

### 17.3 为什么这种组织方式适合 Unity 热更新

因为它满足几个关键目标：

1. 脚本可拆分。
2. 模块边界清晰。
3. 热更新可定位到具体业务域。
4. 团队协作时冲突更少。

## 18. 一个适合入门练手的 Lua 页面脚本示例

```lua
local LoginPage = {}
LoginPage.__index = LoginPage

function LoginPage.New(view, loginService)
    local self = setmetatable({}, LoginPage)
    self.view = view
    self.loginService = loginService
    return self
end

function LoginPage:OnOpen()
    print("登录页打开")
end

function LoginPage:OnClickLogin(account, password)
    local success, result = self.loginService:Login(account, password)

    if success then
        print("登录成功", result.userId)
    else
        print("登录失败", result)
    end
end

return LoginPage
```

这段示例里已经包含了很多真实项目常见语言点：

| 语言点 | 体现位置 |
| --- | --- |
| 模块返回 table | `return LoginPage` |
| 对象模拟 | `setmetatable({}, LoginPage)` |
| 实例方法 | `function LoginPage:OnOpen()` |
| 成员访问 | `self.view`、`self.loginService` |
| 多返回值 | `local success, result = ...` |

## 19. 入门到进阶的学习路线建议

### 19.1 第一阶段：先能读懂

先掌握这些：

1. 变量与 `local`
2. `if`、`for`
3. 函数与多返回值
4. table 的数组/字典用法
5. `require`
6. `.` 与 `:`

目标：能读懂普通业务 Lua 脚本。

### 19.2 第二阶段：先能写模块

继续补这些：

1. 模块返回 table
2. 页面/控制器写法
3. `pairs` 与 `ipairs`
4. 闭包
5. `pcall`

目标：能写简单页面逻辑、活动逻辑、配置逻辑。

### 19.3 第三阶段：理解进阶语义

再掌握这些：

1. 元表
2. `__index`
3. 对象模拟
4. 协程
5. 与 Unity / xLua 的桥接约束

目标：能看懂项目里的中大型 Lua 架构代码。

## 20. 最后总结

对于 Unity 热更新开发者来说，学 Lua 最重要的不是“把语法点全背下来”，而是建立下面这套认知：

1. Lua 是动态语言，核心是灵活而不是强类型。
2. `table` 是它最核心的数据结构。
3. 函数是一等值，所以回调、闭包、模块组织都很自然。
4. `.` 和 `:`、`table` 和 `metatable`，决定了你能不能看懂项目里的对象风格代码。
5. Unity 热更新项目里真正高频使用的，不是所有 Lua 语法，而是模块、table、函数、闭包、对象模拟和协程。

如果你只记一句话，那就是：

**站在 C# 开发者视角学 Lua，最关键的不是把它当“简化版 C#”，而是接受它是一门用 `table + function + metatable` 组织世界的语言。**

## 21. 后续建议

如果你想继续往 Unity 实战方向深入，建议下一步接着看这些主题：

| 下一步主题 | 学习价值 |
| --- | --- |
| xLua 双向调用 | 把 Lua 语言知识接到 Unity 工程里 |
| Lua 热更新脚本组织 | 学会搭真正可维护的业务脚本层 |
| Lua 页面框架 | 学会 UI 脚本化 |
| Lua 性能与 GC | 避免项目后期卡顿和内存问题 |
| Hotfix 与业务脚本边界 | 明确 Lua 在项目中的职责 |

如果你愿意，我下一篇也可以继续补成配套文章，例如：

1. `Lua 常见语法陷阱与 C# 开发者误区清单`
2. `Unity xLua 双向调用从入门到实战`
3. `Lua 面向对象写法与元表实战详解`
