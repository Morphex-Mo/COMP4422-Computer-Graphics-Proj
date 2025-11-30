import os
import numpy as np
import PIL.Image
from collections import Counter
import trimesh
from trimesh.visual.material import PBRMaterial

def get_sorted_colors_by_frequency(gltf_path, top_n=None):
    """
    获取模型中所有顶点颜色，按出现频率排序
    
    参数:
        gltf_path: GLTF模型文件路径
        top_n: 可选，只返回前N个高频颜色（默认返回全部）
    返回:
        排序后的列表，每个元素为(颜色(RGB元组), 出现次数, 频率占比)
    """
    # 加载模型
    mesh_or_scene = trimesh.load(gltf_path)
    all_colors = []

    # 提取所有网格
    if isinstance(mesh_or_scene, trimesh.Scene):
        meshes = [geom for geom in mesh_or_scene.geometry.values() if isinstance(geom, trimesh.Trimesh)]
    else:
        meshes = [mesh_or_scene] if isinstance(mesh_or_scene, trimesh.Trimesh) else []

    if not meshes:
        raise ValueError("模型中未找到有效的网格数据")

    # 收集所有顶点颜色
    for mesh in meshes:
        # 情况1：顶点色
        if hasattr(mesh.visual, 'vertex_colors') and mesh.visual.vertex_colors is not None:
            vertex_colors = mesh.visual.vertex_colors[:, :3]  # 取RGB
            vertex_colors = (vertex_colors * 255).astype(np.uint8)
            all_colors.extend([tuple(color) for color in vertex_colors])
            continue  # 优先使用顶点色

        # 情况2：纹理采样色
        visual = mesh.visual
        texture_image = None

        # 处理PBR材质
        if isinstance(visual.material, PBRMaterial) and hasattr(visual.material, 'baseColorTexture'):
            texture_image = visual.material.baseColorTexture
        # 处理传统纹理材质
        elif hasattr(visual, 'material') and hasattr(visual.material, 'image'):
            texture_image = visual.material.image

        if texture_image is not None and hasattr(visual, 'uv'):
            # 转换纹理为图像
            if isinstance(texture_image, np.ndarray):
                img = PIL.Image.fromarray(texture_image)
            else:
                img = texture_image

            # 处理UV坐标
            uv = visual.uv
            uv = np.mod(uv, 1.0)  # 处理纹理重复
            width, height = img.size

            # 计算像素坐标
            u = (uv[:, 0] * width).astype(int)
            v = ((1 - uv[:, 1]) * height).astype(int)  # 翻转V轴
            u = np.clip(u, 0, width - 1)
            v = np.clip(v, 0, height - 1)

            # 提取纹理颜色
            img_array = np.array(img)
            if img_array.ndim == 3:
                if img_array.shape[2] >= 3:
                    texture_colors = img_array[v, u, :3]  # RGB
                else:
                    # 单通道转RGB
                    gray = img_array[v, u, 0]
                    texture_colors = np.stack([gray, gray, gray], axis=1)
            else:
                # 2D灰度图转RGB
                gray = img_array[v, u]
                texture_colors = np.stack([gray, gray, gray], axis=1)

            texture_colors = texture_colors.astype(np.uint8)
            all_colors.extend([tuple(color) for color in texture_colors])

    if not all_colors:
        raise ValueError("未找到有效的颜色数据（无顶点色或纹理）")

    # 统计频率并排序
    total = len(all_colors)
    color_counter = Counter(all_colors)
    # 按出现次数降序排序，次数相同则按颜色值升序
    sorted_colors = sorted(color_counter.items(), key=lambda x: (-x[1], x[0]))
    
    # 计算频率占比并格式化输出
    result = []
    for color, count in sorted_colors[:top_n]:
        frequency = count / total
        result.append((color, count, frequency))
    
    return result

# 使用示例
if __name__ == "__main__":
    gltf_file = "scene.gltf"  # 替换为你的模型路径
    if os.path.exists(gltf_file):
        try:
            # 获取所有颜色（如需前10名可改为top_n=10）
            sorted_colors = get_sorted_colors_by_frequency(gltf_file)
            
            # 输出结果（打印前10条示例，全量可删除切片）
            print(f"共检测到 {len(sorted_colors)} 种不同颜色，总顶点数: {sum(c[1] for c in sorted_colors)}")
            print("颜色排序（频率从高到低）：")
            for i, (color, count, freq) in enumerate(sorted_colors[:10], 1):
                print(f"第{i}名: RGB{color}，出现{count}次，占比{freq:.2%}")
                
        except Exception as e:
            print(f"错误: {str(e)}")
    else:
        print(f"文件不存在: {gltf_file}")