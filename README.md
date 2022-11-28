# Uni Sufferers
A university-themed game focussing on students' mental health developed in Python and Processing.

## Important notes
- This game is developed in Processing using Python, so it only works after installing Processing
- When running the game, make sure to import the 'sound' and 'minim' libraries from Processing
- Before running the game, rename the main folder to 'Final_Project' (it is currently named 'uni-sufferers'
- The code for the game can be found [here](https://github.com/maazahmedd/uni-sufferers/blob/main/Final_Project.pyde)

## Concept
Almost everyone we know around us has been greatly affected by the change in education systems since the beginning of the pandemic. Virtual classes have led to people having to take 5am classes (due to difference in time zones), having lower attention spans, facing anxiety and having to get through tens of assignments every week. In between all of this, we often fail to realize the importance of taking care of our mental health. This game is an NYU-themed game built around the idea of the player helping Faiza the Falcon (our beloved mascot) avoid multiple obstacles in order to save her mental health. These obstacles are 5am zoom classes, class discussions, assignments and anxiety, all of which behave in different ways. The last level (level 11) is about helping Faiza achieve the 4.0 GPA by avoiding certain distractions once she is able to save her mental health.

## Main Features
All of the obstacles in the game behave in very different ways.
- The clocks in the first few levels only move horizontally between the corners of the grid. They have end points, and once they touch one of the end points, the direction of their velocity is reversed and they continue moving in the opposite direction.
- The pop quizzes behave in a very interesting way. They pop up at random locations on the screen, stay there for a while and then they disappear and move to a completely different random location.
- Anxiety remained my favorite throughout the game (I promise it made me very anxious as I tried to make it work on the very last day). Anxiety constantly follows Faiza as Faiza moves around the screen, but with a lesser speed. This means that Faiza can not stay at the same location for a long period of time because the moving anxiety will chase her down.
- Assignments are shot towards Faiza’s coordinates at a certain point in time. They lock Faiza’s coordinates and are then fired with a certain velocity.
- Distractions represent different objects like facebook, instagram, playstation and youtube and all of them behave in the same way. They are instantiated with random velocities within a certain range and they rebound off the walls as they hit them.

## Biggest Challenge
Although implementing the entire game was a challenging process overall, perhaps the most difficult part for me was to figure out the functionalities of assignments and anxiety. I countered each one of them in the following ways:
- Since I intended to make anxiety follow Faiza at all times, I decided to make a dummy within the Anxiety class which would allow everything to be dealt with within the Anxiety class. This dummy would not be visible but would have the same x and y coordinates (target_x and target_y), same radius (target_r) and would move with key strokes the same as Faiza did. Then I created variables called difference_x and difference_y which recorded the difference in the x and y coordinates of the anxiety and the dummy. By using trigonometric identities, I could then figure out the direction in which anxiety had to move in order to follow the dummy (and hence, Faiza). Since Faiza’s (and hence the dummy’s) coordinates were constantly changing, it seemed like anxiety is constantly following Faiza.
- Making the assignments work was a little easier after I figured out how to make anxiety work. This again had target coordinates which were those of Faiza. Whenever an object of the Assignment class was instantiated, it would lock the coordinates of Faiza at that time, then make use of trigonometry to be shot at that position with a certain velocity.

## Reflection
I don’t think I have ever worked harder for any project, any class. I don’t even know how many all-nighters I have pulled off to try to make this work, but I am super proud of how much I have learnt and more importantly, of how I have made this work.

This was so much more than learning about the features of classes. This was about learning how to reflect images, how to implement parallax backgrounds (you can see the background moving as Faiza moves in the x-direction). Honestly, when I started this I didn’t even know not all backgrounds could be implemented as parallax backgrounds –  they had to be symmetric for them to look nice, otherwise it’s just a broken image. Additionally, this project was about learning how to make sprites on my own using https://www.piskelapp.com/ (I made most of them on my own, including that of Faiza, assignments, class discussions, anxiety, GPA, brain and parties). I have learnt about working with collision detection and with counters to display real-time scores as the game progresses. It also helped me learn how to use key presses and mouse clicks to start (and restart) the game and control movements of certain objects.

I have learnt a lot from this process and enjoyed it way more than I thought I would.
