# 定义汽车类 Car，包含品牌、颜色和产地 3 个变量。定义构造方法用于初始化上述 3 个变量的值，然后再定义一个方法，输出汽车的相关信息。
class Car:
    # 构造方法
    def __init__(self, brand, color, origin):
        self.brand = brand
        self.color = color
        self.origin = origin

    # 输出汽车信息
    def show_info(self):
        print(f"品牌：{self.brand}，颜色：{self.color}，产地：{self.origin}")


# 测试
if __name__ == "__main__":
    c = Car("比亚迪", "白色", "中国")
    c.show_info()
