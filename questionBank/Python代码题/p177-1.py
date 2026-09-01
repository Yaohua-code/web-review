# 定义水果类 Fruit，包含水果名、产地和单价 3 个变量，定义 setXxx()方法和 getXxx()方法读写变量的值。然后创建 3 个水果类的对象，设置和输出 3 种不同水果的信息。
class Fruit:
    def __init__(self, name="", origin="", price=0):
        self.__name = name
        self.__origin = origin
        self.__price = price

    # set/get
    def set_name(self, n):
        self.__name = n

    def get_name(self):
        return self.__name

    def set_origin(self, o):
        self.__origin = o

    def get_origin(self):
        return self.__origin

    def set_price(self, p):
        self.__price = p

    def get_price(self):
        return self.__price

    def show(self):
        print(f"{self.get_name()}｜{self.get_origin()}｜{self.get_price()}元")


fruits = [
    Fruit("苹果", "山东", 5.8),
    Fruit("芒果", "海南", 9.5),
    Fruit("葡萄", "新疆", 12),
]
for fruit in fruits:
    fruit.show()
