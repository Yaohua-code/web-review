# 使用 for 循环输出一个正立实心等腰三角形。
n = 5  # 三角形行数，可以修改
for i in range(1, n + 1):
    # 打印空格
    for j in range(n - i):
        print(" ", end="")
    # 打印星号
    for k in range(2 * i - 1):
        print("*", end="")
    print()
