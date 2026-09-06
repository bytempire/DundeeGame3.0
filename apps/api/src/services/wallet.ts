import { prisma, LedgerKind, type User } from "@dundee/db";

export async function creditCoins(
  userId: string,
  amount: number,
  kind: LedgerKind,
  ref?: { refType?: string; refId?: string; note?: string },
): Promise<User> {
  if (amount === 0) {
    return prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { coinBalance: { increment: amount } },
    });
    await tx.walletLedger.create({
      data: {
        userId,
        kind,
        amount,
        balanceAfter: user.coinBalance,
        refType: ref?.refType,
        refId: ref?.refId,
        note: ref?.note,
      },
    });
    return user;
  });
}

export async function debitCoins(
  userId: string,
  amount: number,
  kind: LedgerKind,
  ref?: { refType?: string; refId?: string; note?: string },
): Promise<User> {
  if (amount <= 0) throw new Error("debit amount must be positive");
  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (current.coinBalance < amount) {
      throw new Error("insufficient coins");
    }
    const user = await tx.user.update({
      where: { id: userId },
      data: { coinBalance: { decrement: amount } },
    });
    await tx.walletLedger.create({
      data: {
        userId,
        kind,
        amount: -amount,
        balanceAfter: user.coinBalance,
        refType: ref?.refType,
        refId: ref?.refId,
        note: ref?.note,
      },
    });
    return user;
  });
}
