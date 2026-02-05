:::abstract
最后更新时间：2026年2月2日11:21:35<br>
笔记来源：Youtube CodeMonkey [How to use Addressables FASTER Loading FREE Memory SMALL Download](https://www.youtube.com/watch?v=C6i_JiRoIfk)
:::

Addressables 是 Unity 的资源管理系统，核心是**按需加载资源**（而非自动加载），解决大型游戏的**内存占用**和**加载时间**问题。支持从本地或云端动态加载/卸载资源，无需重新打包即可更新资源。  


**核心优势**  
1. **内存优化**：资源仅在需要时加载，未使用时释放，降低内存占用（如《上古卷轴》《GTA》等大型游戏无法一次性加载整个世界）。  
2. **加载速度提升**：初始加载仅加载必要资源，大幅缩短启动时间（示例中从 20 秒降至 2 秒）。  
3. **动态更新**：支持从云端服务器推送资源更新，玩家无需下载新版本即可获取新内容。  
4. **异步加载**：基于异步操作（`LoadAssetAsync`），不阻塞主线程，避免游戏卡顿。  


## **一. 基础配置**  

##### 1. 安装与配置  
- **安装包**：通过 Package Manager 安装 `Addressables` 包（Window → Package Manager → 搜索 Addressables）。  
- **初始化设置**：打开 Addressables Groups 窗口（Window → Asset Management → Addressables → Groups），点击“Create Addressable Settings”生成配置文件。  


##### 2. 标记资源为可寻址  
- **单个资源**：将资源（如预制件、图片）拖入 Addressables Groups 窗口的组中（默认生成 `Default Local Group`），自动标记为可寻址。  
- **文件夹**：直接拖入整个文件夹到组中，文件夹内所有资源自动标记为可寻址（便于批量管理）。  


## 二. 通过代码加载资源  
### **1. 基础方法：字符串路径**
使用 `Addressables.LoadAssetAsync<T>(string address)`，传入资源路径（从 Groups 窗口复制），返回 `AsyncOperationHandle<T>`，监听 `completed` 事件获取资源并实例化。  
```csharp
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

public class SpawnObject : MonoBehaviour
{
    public string assetPath; // 在Addressables资源中的路径

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.T))
        {
            // 异步加载资源
            AsyncOperationHandle<GameObject> handle = Addressables.LoadAssetAsync<GameObject>(assetPath);
            handle.Completed += op =>
            {
                if (op.Status == AsyncOperationStatus.Succeeded) // 加载成功
                {
                    Instantiate(op.Result); // 实例化资源
                }
                else
                {
                    Debug.LogError("加载失败");
                }
            };
        }
    }
}
```  

### **2. Asset Reference**  
使用 `AssetReference` 类型（序列化字段），在 Inspector 中直接拖入资源（无需手动输入路径），更安全（避免拼写/大小写错误）。  
```csharp
public AssetReference prefabRef;

void Update()
{
    if (Input.GetKeyDown(KeyCode.T))
    {
        // 通过实例化
        prefabRef.LoadAssetAsync<GameObject>().Completed += op =>
        {
            if (op.Status == AsyncOperationStatus.Succeeded)
                Instantiate(op.Result);
        };
        // 直接实例化
        prefabRef.InstantiateAsync();
    }
}
```  
:::warning
`AssetReference`可以引用任意类型的Addressables资源，因此代码中可能会可能出错，如：通过`Instantiate`实例化一个Texture2D类型的资源

解决方案：<br>
使用特定类型的`AssetReference`，如`AssetReferenceGameObject`，`AssetReferenceSprite`等

对于API中不存在的特定类型，可通过继承`AssetReferenceT<>`创建自定义类型的`AssetReference`
如`AssetReferenceAudioClip`
```C#
[Serializable]
public class AssetReferenceAudioClip : AssetReferenceT<AudioClip>
{
    public AssetReferenceAudioClip(string guid) : base(guid) { }
}
```
:::

### **3. 标签（Label）加载**  

为资源打标签（Groups 窗口 → Labels 管理），通过标签批量加载资源（支持多标签）。  
:::info
标签与资源是多对多的关系
:::

```c#
public AssetLabelReference assetLabelReference;

void Update()
{
    if (Input.GetKeyDown(KeyCode.T))
    {
        Addressables.LoadAssetsAsync<GameObject>(assetLabelReference, null).Completed += op =>
        {
            foreach (var asset in op.Result)
                Debug.Log("加载资源: " + asset.name);
        };
    }
}
```  

### **4. 多资源加载**
使用 `Addressables.LoadAssetsAsync<T>(IList<AssetLabelReference> labels, null)` 加载多个资源（支持标签批量加载）。  
:::warning
可寻址文件夹仅用于组织资源（无法直接加载文件夹，需通过标签或逐个引用）<br>
无法直接使用该函数通过路径加载文件夹或加载引用了文件夹的`AssetReference`对象<br>
资源放入可寻址文件夹会自动标记为可寻址
:::

## 三. 卸载资源  
- **释放操作句柄**：使用 `Addressables.Release(AsyncOperationHandle handle)` 释放单个资源。  
- **释放实例**：若通过 `InstantiateAsync` 实例化，使用 `Addressables.ReleaseInstance(instance)` 释放实例并释放内存。  
- **场景切换自动卸载**：单场景模式下切换场景时，未使用的资源自动卸载；多场景加载需手动管理。  


## **四、高级**  
**Profiles 配置**：  
   管理不同环境的路径（如测试/生产环境），设置本地/远程资源路径。  

**分析工具**：  
   - **Event Viewer**：监控加载事件（需启用 `Send Profiler Events` 设置）。  
   - **Analyze Window**：分析资源依赖关系，优化资源包。  
   - **Hosting Window**：连接外部服务器托管资源（复杂用例）。  

 **后续学习**  
- 云端资源动态更新（无需重新打包）。  
- 使用 Unity Cloud Content Delivery (CCD) 作为 CDN 分发资源。  
