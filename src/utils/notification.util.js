import { Expo } from "expo-server-sdk"
const expo = new Expo();

export const sendNotification = async (data) => {

    const { token, title, body, metadata } = data;
    try {

        if (!Expo.isExpoPushToken(token)) {
            throw new Error("Invalid push token", 400);
        }

        const message = {
            to: token,
            sound: "default",
            title: title,
            body: body,
            data: metadata || {},
        };

        const tickets = await expo.sendPushNotificationsAsync([message]);

        return tickets;
    } catch (err) {
        console.log(err)

        return "Error while sending notification" + err
    }

}
