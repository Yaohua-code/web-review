# 编写程序，实现输入体重和身高，输出身体质量指数（body mass index, BMI），其计算公式如下。
# BMI= 体重 / (身高 * 身高)
# 其中，体重的单位是 kg，身高的单位是 m，均为浮点数。
weight = float(input("请输入体重(kg)："))
height = float(input("请输入身高(m)："))
bmi = weight / (height**2)
print(f"BMI值为：{bmi:.2f}")
