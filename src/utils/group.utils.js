
export const generateAlphanumericCode = (length = 6) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};


export const calculateGroupBalance = (groupData, userId) => {
    if (!groupData || !userId) {
        return {
            allBalances: {},
        };
    }
    groupData = JSON.parse(JSON.stringify(groupData, null, 2));
    const allBalances = {};

    // Initialize balances for all members
    groupData.members.forEach((member) => {
        if (member._id?.toString() !== userId) {
            allBalances[member._id?.toString()] = 0;
        }
    });

    // Calculate total owed and owed to user
    groupData.expenses.forEach((expense) => {
        const splitAmount = expense.amount / expense.split_between.length;
        const paidBy = expense.paid_by;
        const userInSplit = expense.split_between.includes(userId);
        if (expense.paid_by === userId) {
            // User paid, others owe user
            expense.split_between.forEach((memberId) => {
                if (memberId !== userId) {
                    allBalances[memberId] += splitAmount;
                }
            });
        } else if (userInSplit) {
            allBalances[paidBy] -= splitAmount;
        }
    });

    return allBalances;
};