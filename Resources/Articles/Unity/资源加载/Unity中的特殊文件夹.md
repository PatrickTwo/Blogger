# 资源加载相关
1. Resource
2. StreamingAssets

## 1. **Resources 文件夹**

### 基本特性
- **编译处理**：资源会被压缩并打包到游戏中
- **内存管理**：Unity自动管理内存，支持资源卸载
- **访问方式**：使用`Resources.Load()`系列方法
- **平台支持**：全平台支持
- **构建影响**：增加应用安装包大小
- 打包后只能读取不能写入

### 使用方式
```csharp
// 同步加载
GameObject prefab = Resources.Load<GameObject>("Prefabs/Character");
Texture2D texture = Resources.Load<Texture2D>("UI/Icon");

// 异步加载
ResourceRequest request = Resources.LoadAsync<GameObject>("Prefabs/Character");
yield return request;
GameObject loadedPrefab = request.asset as GameObject;

// 加载所有资源
Object[] allSprites = Resources.LoadAll<Sprite>("Sprites/CharacterSheet");

// 卸载资源
Resources.UnloadAsset(texture);
Resources.UnloadUnusedAssets();
```

### 文件夹结构示例
```
Assets/
└── Resources/
    ├── Prefabs/
    │   ├── Character.prefab
    │   └── Enemy.prefab
    ├── UI/
    │   ├── Icon.png
    │   └── Button.prefab
    └── Configs/
        └── GameConfig.json
```

## 2. **StreamingAssets 文件夹**

### 基本特性
- **原样复制**：资源不压缩，原样复制到目标平台
- **只读访问**：运行时只能读取，在所有平台上都不支持写入
- **路径访问**：通过`Application.streamingAssetsPath`获取完整路径
- **构建影响**：增加应用安装包大小
  
### 平台路径差异
> 官方推荐使用`Application.streamingAssetsPath`来获得该文件夹的实际位置，其可以规避平台差异

对于Unity Editor，Windows平台，其等价于：Application.dataPath+"/StreamingAssets"
对于macOS，其等价于：Application.dataPath+"/Resources/Data/StreamingAssets"
对于ios平台，其等价于:Application.dataPath + "/Raw";
对于android平台，其等价于:"jar:file://" + Application.dataPath + "!/assets/";

### 平台读取差异 
1. 对于**非Android和WebGL平台**，支持File或者Stream的同步读取。同时File或者Directory类的方法也都可用
2. 但对于**Android平台和WebGL平台**，对StreamingAssets目录使用File类，`UnityEngine.Windows.Directory`类（官方文档注释：[此类仅在面向通用 Windows 平台时可用](https://docs.unity.cn/cn/2021.3/ScriptReference/Windows.Directory.html)）的方法，以及Stream方式的读取都不支持，`System.IO.Directory`也不可用，因为在 Android 平台上，Application.streamingAssetsPath指向的是 APK 内的 /assets目录，这个目录在构建时被打包进 APK，并不是一个普通的文件系统目录

可使用UnityWebRequest(使用WWW类进行读取已废弃)对StreamingAssets下的文件进行读取,该方法是异步的（且全平台通用）
1. **Android平台**下的同步读取方法：可以考虑在游戏运行时，把StreamingAssets下的文件写入persistentDataPath，后续的读取和写入都在persistentDataPath进行。或针对Android平台提供额外的jar,对StreamingAssets下的文件进行同步操作



## 3. **详细对比表格**

| 特性 | Resources | StreamingAssets |
|------|-----------|-----------------|
| **编译处理** | 压缩、序列化 | 原样复制 |
| **内存管理** | Unity自动管理 | 手动管理 |
| **访问方式** | `Resources.Load()` | 文件I/O或WWW |
| **平台路径** | 统一API访问 | 平台相关路径 |
| **资源类型** | Unity支持的所有类型 | 任意文件类型 |
| **读写权限** | 只读 | 只读 |
| **热更新支持** | 不支持 | 部分平台支持 |
| **加载速度** | 快（已优化） | 相对较慢 |

## 4. **实际应用场景**

### Resources 适用场景
```csharp
// 1. 预制的游戏对象
GameObject enemyPrefab = Resources.Load<GameObject>("Enemies/Goblin");

// 2. 频繁使用的资源
Sprite uiSprite = Resources.Load<Sprite>("UI/Icons/Health");

// 3. 配置数据（小型）
TextAsset configText = Resources.Load<TextAsset>("Config/LevelData");
LevelData data = JsonUtility.FromJson<LevelData>(configText.text);

// 4. 声音资源
AudioClip soundEffect = Resources.Load<AudioClip>("Audio/SFX/Explosion");
```

### StreamingAssets 适用场景
```csharp
// 1. 大型二进制文件（视频、音频）
IEnumerator LoadVideo()
{
    string videoPath = Path.Combine(Application.streamingAssetsPath, "Videos/tutorial.mp4");
    // 使用UnityWebRequest或文件API加载
}

// 2. 平台特定的原生库
// 3. 需要保持原样的文件（加密数据、数据库）
// 4. 热更新资源（配合AssetBundle）
```

## 5. **最佳实践和注意事项**

### Resources 注意事项
```csharp
// ❌ 避免：过度使用Resources文件夹
// ✅ 推荐：合理组织，避免深层嵌套

// 内存管理示例
void ManageResources()
{
    // 明确卸载不再需要的资源
    Resources.UnloadUnusedAssets();
    
    // 对于大型资源，考虑异步加载
    StartCoroutine(LoadLargeResourceAsync());
}

IEnumerator LoadLargeResourceAsync()
{
    ResourceRequest request = Resources.LoadAsync<Texture2D>("LargeTextures/Background");
    while (!request.isDone)
    {
        float progress = request.progress;
        yield return null;
    }
    
    Texture2D texture = request.asset as Texture2D;
}
```

### StreamingAssets 最佳实践
```csharp
// 跨平台加载封装
public class StreamingAssetsLoader
{
    public static IEnumerator LoadTextFile(string relativePath, Action<string> onComplete)
    {
        string fullPath = Path.Combine(Application.streamingAssetsPath, relativePath);
        
        if (Application.platform == RuntimePlatform.Android)
        {
            using (UnityWebRequest www = UnityWebRequest.Get(fullPath))
            {
                yield return www.SendWebRequest();
                if (www.result == UnityWebRequest.Result.Success)
                {
                    onComplete?.Invoke(www.downloadHandler.text);
                }
            }
        }
        else
        {
            if (File.Exists(fullPath))
            {
                string content = File.ReadAllText(fullPath);
                onComplete?.Invoke(content);
            }
        }
    }
}
```

## 6. **性能优化建议**

### Resources 优化
- 将相关资源打包成AssetBundle减少Resources使用
- 使用`Resources.UnloadUnusedAssets()`及时释放内存
- 避免在Resources中存放过多资源

### StreamingAssets 优化
- 对大文件进行分块读取
- 使用缓存机制避免重复I/O操作
- 考虑文件压缩和加密需求

通过合理选择和使用这两种文件夹，可以有效地管理游戏资源，平衡安装包大小、内存使用和加载性能。