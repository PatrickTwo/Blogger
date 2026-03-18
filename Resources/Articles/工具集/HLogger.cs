using UnityEditor;
using UnityEngine;
/// <summary>
/// 封装日志输出类
/// </summary>
public static class HLogger
{
    /// <summary>
    /// 输出带有调用实例的日志信息
    /// </summary>
    /// <param name="go">调用该方法的实例</param>
    public static void LogWithInstance(Transform go, string message, Color color)
    {
        Debug.Log($"-----<color={color}>[{go.name}] : {message}</color>-----");
    }

    /// <summary>
    /// 输出带有调用实例的警告信息
    /// </summary>
    /// <param name="go">调用该方法的实例</param>
    public static void LogWarningWithInstance(Transform go, string message, Color color)
    {
        Debug.LogWarning($"-----<color={color}>[{go.name}] : {message}</color>-----");
    }
    /// <summary>
    /// 输出带有调用实例的错误信息
    /// </summary>
    /// <param name="go">调用该方法的实例</param>
    public static void LogError(string message)
    {
        Debug.LogError($"-----<color=red>{message}</color>-----");
    }

    /// <summary>
    /// 输出不同颜色的日志信息
    /// <para>默认为红色</para>
    /// </summary>
    public static void Log(string message, Color color = default)
    {
        if (color == default)
            color = Color.red;
        string hexColor = ColorUtility.ToHtmlStringRGB(color);
        Debug.Log($"-----<color=#{hexColor}>{message}</color>-----");
    }
    /// 用于定位调试
    public static void LogDebug(string message)
    {
        Log(message, Color.yellow);
    }
    /// <summary>
    /// 输出绿色的成功信息
    /// </summary>
    /// <param name="message"></param>
    public static void LogSuccess(string message)
    {
        Log(message, Color.green);
    }
    public static void LogFail(string message)
    {
        Log(message, Color.red);
    }
}