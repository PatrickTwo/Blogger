## 一、反射与特性的基本概念

### 1. 反射（Reflection）
- **定义**：在运行时动态获取程序集中的类型信息（类、接口、字段、属性、方法等）
- **能力**：可以实例化类、调用方法、操作字段值等
- **应用场景**：动态加载程序集、序列化、属性面板、性能测试等

### 2. 特性（Attribute）
- **定义**：为代码元素（类、方法、属性等）添加元数据的标签
- **特点**：
  - 特性本身不产生任何效果，需要配合反射使用
  - 只是标记，需要反射读取并添加逻辑才能发挥作用
- **常见应用**：JSON序列化控制、属性面板显示控制、性能测试标记等

## 二、反射与特性的关系
- **反射是特性的充分条件**：使用特性必须用到反射
- **特性是反射的必要条件**：使用反射不一定需要特性，但特性需要反射来读取

## 三、实际应用案例

### 案例1：自定义序列化器
```csharp
// 自定义序列化方法
public string Serialize(object obj)
{
    var properties = obj.GetType().GetProperties();
    var keyValues = properties
        .Where(p => 
        {
            var attr = p.GetCustomAttribute<BrowsableAttribute>();
            return attr == null || attr.Browsable;
        })
        .Select(p => $"{p.Name}:{p.GetValue(obj)}");
    
    return string.Join(Environment.NewLine, keyValues);
}

// 自定义特性
[AttributeUsage(AttributeTargets.Property)]
public class BrowsableAttribute : Attribute
{
    public bool Browsable { get; set; }
    public BrowsableAttribute(bool browsable) => Browsable = browsable;
}
```

### 案例2：简易性能测试框架
```csharp
// Benchmark特性
[AttributeUsage(AttributeTargets.Method)]
public class BenchmarkAttribute : Attribute { }

// 测试运行器
public void RunBenchmarks<T>() where T : new()
{
    var methods = typeof(T).GetMethods()
        .Where(m => m.GetCustomAttribute<BenchmarkAttribute>() != null);
    
    var instance = new T();
    foreach (var method in methods)
    {
        var watch = Stopwatch.StartNew();
        for (int i = 0; i < 10000000; i++)
        {
            method.Invoke(instance, null);
        }
        Console.WriteLine($"{method.Name}: {watch.ElapsedMilliseconds}ms");
    }
}
```

### 案例3：简易属性编辑器
```csharp
public void MyPropertyEditor(object selectedObject)
{
    var properties = selectedObject.GetType().GetProperties();
    
    foreach (var prop in properties)
    {
        var editor = GetEditor(prop, selectedObject);
        // 显示编辑器控件
    }
}

private UIElement GetEditor(PropertyInfo info, object obj)
{
    if (info.PropertyType == typeof(string))
    {
        var textBox = new TextBox { Text = info.GetValue(obj)?.ToString() };
        textBox.TextChanged += (s, e) => 
            info.SetValue(obj, ((TextBox)s).Text);
        return textBox;
    }
    // 处理其他类型...
}
```

## 四、特性的高级用法

### 1. 特性目标限制
```csharp
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Method)]
public class CustomAttribute : Attribute { }
```

### 2. 特性参数设置
```csharp
public class CustomAttribute : Attribute
{
    public string Tag { get; set; }
    public bool Flag { get; set; }
    
    public CustomAttribute(int value) { }
}

// 使用方式
[Custom(123, Tag = "example", Flag = true)]
public string Name { get; set; }
```

## 五、反射的核心方法

### 1. 获取类型信息
```csharp
Type type = obj.GetType();
Type type = typeof(MyClass);
Type type = Type.GetType("Namespace.MyClass");
```

### 2. 获取成员信息
```csharp
// 获取属性
PropertyInfo[] properties = type.GetProperties();

// 获取方法
MethodInfo[] methods = type.GetMethods();

// 获取特性
var attributes = property.GetCustomAttributes<MyAttribute>();
```

### 3. 动态操作
```csharp
// 创建实例
object instance = Activator.CreateInstance(type);

// 调用方法
method.Invoke(instance, parameters);

// 设置属性值
property.SetValue(instance, value);
```

## 六、实际开发建议

1. **理解应用场景**：反射和特性主要用于框架开发、序列化、UI绑定等需要动态处理的场景

2. **性能考虑**：反射操作相对较慢，应在必要时使用

3. **灵活运用**：结合泛型、表达式树等技术可以优化反射性能

4. **常见应用**：
   - JSON序列化（Newtonsoft.Json）
   - 属性面板（PropertyGrid）
   - 性能测试（BenchmarkDotNet）
   - ORM框架
   - 依赖注入容器

通过这三个实际案例，可以深入理解反射和特性如何协同工作，为开发提供强大的动态编程能力。