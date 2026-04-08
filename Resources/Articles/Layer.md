---
title: "Layer"
category: "Unity"
date: "2026-03-03"
updatedAt: "2026-03-03"
---

# Unity 中的 LayerMask 详解

## 一、什么是 LayerMask

**LayerMask（层遮罩）** 是 Unity 中用于**按层级过滤对象**的一种机制，本质是一个 **32 位整数**，每一位对应一个 Layer（层）。  
它常用于：

- 射线检测（Raycast）
- 物理碰撞检测
- 摄像机剔除（Culling Mask）
- 粒子系统发射碰撞等

---

## 二、Layer 与 LayerMask 的关系

Unity 最多支持 **32 个自定义层**（0~31）：

| 层编号 | 名称         | 说明             |
|--------|--------------|------------------|
| 0      | Default      | 默认层           |
| 1      | TransparentFX| 透明特效         |
| 2      | Ignore Raycast| 忽略射线检测     |
| 3~7    | 内置         | 部分被占用       |
| 8~31   | 用户自定义   | 可自由命名和使用 |

**LayerMask 的每一位** 代表是否包含该层。  
例如：

- 只检测第 8 层 → `LayerMask = 1 << 8`
- 检测第 8 层和第 9 层 → `LayerMask = (1 << 8) | (1 << 9)`

---

## 三、常用操作方式

### 1. 在 Inspector 中设置

在脚本中声明：

```csharp
public LayerMask myLayerMask;
```

Inspector 面板会显示为一个 **下拉多选框**，方便直接勾选需要的层。

---

### 2. 代码创建 LayerMask

```csharp
// 只检测 "Enemy" 层（假设 Enemy 层编号为 8）
int layerIndex = LayerMask.NameToLayer("Enemy");
LayerMask mask = 1 << layerIndex;

// 或者直接用字符串
LayerMask mask2 = LayerMask.GetMask("Enemy", "Player");
```

---

### 3. 组合多个层

```csharp
// 同时检测 Enemy(8) 和 Player(9)
LayerMask mask = (1 << 8) | (1 << 9);

// 或者使用 GetMask
LayerMask mask2 = LayerMask.GetMask("Enemy", "Player");
```

---

### 4. 取反（排除某层）

```csharp
// 检测除了 Enemy 层之外的所有层
LayerMask allButEnemy = ~((1 << LayerMask.NameToLayer("Enemy")));
```

---

### 5. 与射线检测结合

```csharp
void Update()
{
    if (Input.GetMouseButtonDown(0))
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
        RaycastHit hit;
        
        // 只检测 "Ground" 层
        int groundLayer = LayerMask.NameToLayer("Ground");
        LayerMask groundMask = 1 << groundLayer;
        
        if (Physics.Raycast(ray, out hit, Mathf.Infinity, groundMask))
        {
            Debug.Log("点击到地面：" + hit.point);
        }
    }
}
```

---

## 四、常见用途示例

| 场景               | 用法说明                                   |
|--------------------|--------------------------------------------|
| 射线检测特定层     | `Physics.Raycast(..., layerMask)`          |
| 摄像机渲染特定层   | Camera.cullingMask = layerMask              |
| 忽略某层碰撞       | 在 Physics 设置中调整 Layer Collision Matrix |
| 粒子碰撞特定层     | ParticleSystem 的 Collision 模块中设置     |

---

## 五、注意事项

1. **层编号从 0 开始**，但 Inspector 中显示的是层名，不是数字。
2. **GetMask 返回的是已经左移好的掩码**，不需要再 `<<`。
3. 如果层名不存在，`NameToLayer` 返回 -1，使用时需检查。
4. 层编号 0~7 中有部分是 Unity 内置保留的，自定义层建议从 8 开始。

---

需要我帮你写一个 **完整的 LayerMask 工具类**，方便项目中快速调用吗？