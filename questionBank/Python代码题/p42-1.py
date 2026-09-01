# 编写程序，实现输入某商品的单价和数量，计算商品的总价并输出。
price = float(input("请输入商品单价："))
num = int(input("请输入商品数量："))
total = price * num
print(f"商品总价为：{total}")
