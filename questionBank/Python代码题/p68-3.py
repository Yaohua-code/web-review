# 使用 while 循环输出 2～100 的所有素数（只能被 1 和自己整除的自然数）。
num = 2
while num <= 100:
    is_prime = True
    i = 2
    while i * i <= num:
        if num % i == 0:
            is_prime = False
            break
        i += 1
    if is_prime:
        print(num, end=" ")
    num += 1
