
Google Chatbot
Chat bots are computer programs that mimic conversation with people using artificial intelligence. We are using the google chatbot as part of our project where the user can interact with the application via text or voice to find the closest water resource.
1.	Using the Actions on Google Console and create a new project. 
2.	Under Build a custom app, click BUILD in the Dialogflow box and then click Create Actions on Dialogflow.
3.	Click Save to save the project.
4.	Under Intents, click create intent and under User says type in a set of custom queries that are expected from the users
5.	Under Actions type a custom action name. This action name will help you understand as to which set of answers are to be invoked. Add the parameters that are to be fetched from the user’s queries such as Location, date etc. 
6.	Under Responses, add the custom responses that might serve as answers to the User’s queries.
7.	Below Responses, click on Fulfillment, and check the Use Webhook option. This enables you to get an end point onto which the custom questions and answers get posted. 
8.	Click on the gear icon to see the project settings.
9.	Deploy the fulfillment webhook provided in the functions folder using Google Cloud Functions for Firebase:
10. Go back to the Dialogflow console and select Fulfillment from the left navigation menu. Enable Webhook, set the value of URL to the Function URL from the previous step, then click Save.
11.	Select Intents from the left navigation menu. Select the handle_permission fallback intent, scroll down to the Actions on Google section, check End Conversation, then click Save.
12.	Select Integrations from the left navigation menu and open the Settings menu for Actions on Google.
13.	Enter the following intents as Additional triggering intents
o	request_location_permission
14.	Click Test.
15.	Click View to open the Actions on Google simulator.
16.	Type Talk to my test app in the simulator, or say OK Google, talk to my test app to any Actions on Google enabled device signed into your developer account.
