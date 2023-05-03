export const timeoutPromise = (timeout: any) => {
    let timeoutId;
    const promise: Promise<void> = new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
            reject('timeout');
        }, timeout);
    });
    return {
        timeoutId,
        promise
    };
};