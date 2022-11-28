add_library('sound')
# Adding the 'minim' library for sound and importing relevant modules
# Also, getting the path for future reference
add_library('minim')
import random, os
path = os.getcwd()
player = Minim(this)

# Creating a Creature class which stores all the basic attributes, including the creature's position, radius, initial x and y velocities, and image attributes. 
# Each 'creature' will inherit certain attributes from this class and its display function where necessary.
class Creature:
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames):
        self.x = x
        self.y = y
        self.r = r
        self.vx = 0
        self.vy = 0
        self.dir = RIGHT
        self.img = loadImage(path + "/images/" + img_name)
        self.img_w = img_w
        self.img_h = img_h
        self.num_frames = num_frames
        self.frame = 0
        
    # This function displays the image of each creature and inverts it according to the creature's direction of motion. It calls the update function of that specific creature.
    def display(self):
        self.update()
        
        if self.dir == RIGHT:
            image(self.img, self.x - self.img_w//2, self.y - self.img_h//2, self.img_w, self.img_h, self.frame * self.img_w, 0, (self.frame + 1) * self.img_w, self.img_h)
        elif self.dir == LEFT:
            image(self.img, self.x - self.img_w//2, self.y - self.img_h//2, self.img_w, self.img_h, (self.frame + 1) * self.img_w, 0, self.frame * self.img_w, self.img_h)

# Creating a class for Faiza the falcon which inherits most of it attributes from the creature class
class Faiza(Creature):
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames):
        Creature.__init__(self, x, y, r, img_name, img_w, img_h, num_frames)
        # A dictionary called self.keyhandler will monitor Faiza's movement using arrow keys
        self.key_handler = {LEFT:False, RIGHT:False, UP:False, DOWN:False}
        # Initially Faiza is set to alive, if Faiza collides with any of the obstacles, then self.alive becomes False and Faiza returns to her original position
        self.alive = True
        # creating two counters which record the number of collisions with obstacles (Level 1-10) and distractions (level 11) respectively
        self.breakdown_cnt = 0
        self.distraction_cnt = 0
        
    def update(self):
        if 0 < game.level <= 5:
            # For level 1-5 there are restrictions on the movement of Faiza because of the grid present in these levels
            # Hence, the following if conditions will restrict Faiza's movement by using coordinates of the lines in the grid/maze.
            # The first condition is for when Faiza moves left
            if self.key_handler[LEFT] == True:
                self.vx = -2
                self.dir = LEFT
                if self.x - self.r + self.vx < 6:
                    self.vx = 0
                if self.x - self.r > 270 and self.x - self.r + self.vx < 280 and (self.y - self.r < 396 or self.y + self.r > 484):
                    self.vx = 0
                if self.x - self.r > 650 and self.x - self.r + self.vx < 660 and self.y - self.r < 286:
                    self.vx = 0
                if self.x - self.r > 820 and self.x - self.r + self.vx < 830 and self.y + self.r > 244:
                    self.vx = 0
                self.x += self.vx
            
            # The next condition is for when Faiza moves right 
            elif self.key_handler[RIGHT] == True:
                self.vx = 2
                self.dir = RIGHT
                if self.x + self.r < 120 and self.x + self.r + self.vx > 110 and (self.y - self.r < 396 or self.y + self.r > 484):
                    self.vx = 0
                if self.x + self.r < 750 and self.x + self.r + self.vx > 740 and self.y + self.r > 244:
                    self.vx = 0
                if self.x + self.r < 920 and self.x + self.r + self.vx > 910 and self.y - self.r < 526:
                    self.vx = 0
                if self.x + self.r > 1018:
                    self.vx = 0
                self.x += self.vx
                
            # If none of the left and right keys are being pressed, Faiza stops moving horizontally
            else:
                self.vx = 0
                
            # The condition below is for when Faiza moves upwards
            if self.key_handler[UP] == True:
                self.vy = -2
                if self.x + self.r < 120 and self.y - self.r + self.vy < 288:
                    self.vy = 0
                if (self.x + self.r >= 120 and self.x - self.r <= 270) and self.y - self.r + self.vy < 398:
                    self.vy = 0
                if (self.x - self.r > 270 and self.x - self.r <= 650) and self.y - self.r + self.vy < 288:
                    self.vy = 0
                if (self.x - self.r > 650 and self.x + self.r < 920) and self.y - self.r + self.vy < 168:
                    self.vy = 0
                if self.x + self.r >= 920 and self.y - self.r + self.vy < 528:
                    self.vy = 0
                self.y += self.vy
                
            # The condition below is for when Faiza moves downwards
            elif self.key_handler[DOWN] == True:
                self.vy = 2
                if self.x + self.r < 120 and self.y + self.r + self.vy > 613:
                    self.vy = 0
                if (self.x + self.r >= 120 and self.x - self.r <= 270) and self.y + self.r + self.vy > 482:
                    self.vy = 0
                if (self.x - self.r > 270 and self.x + self.r < 750) and self.y + self.r + self.vy > 612:
                    self.vy = 0
                if (self.x + self.r >= 750 and self.x - self.r <= 820) and self.y + self.r + self.vy > 242:
                    self.vy = 0
                if (self.x - self.r > 820 and self.x + self.r <= 1024) and self.y + self.r + self.vy > 612:
                    self.vy = 0
                self.y += self.vy
                
            # If none of the up and down keys are being pressed, Faiza stops moving vertically
            else:
                self.vy = 0
               
       # The following conditions restrict Faiza's movement out of the screen dimensions once the grid is removed (level 6 onwards) 
        elif game.level >= 6:
            # The condition below is for when Faiza moves left
            if self.key_handler[LEFT] == True:
                self.vx = -2
                self.dir = LEFT
                if self.x - self.r + self.vx < 6:
                    self.vx = 0
                    
                self.x += self.vx 
                    
            # The condition below is for when Faiza moves right
            elif self.key_handler[RIGHT] == True:
                self.vx = 2
                self.dir = RIGHT
                if self.x + self.r + self.vx > 1018:
                    self.vx = 0 
                    
                self.x += self.vx        

            # If none of the left and right keys are being pressed, Faiza stops moving horizontally
            else:
                self.vx = 0   
            
            # The condition below is for when Faiza moves upwards    
            if self.key_handler[UP] == True:
                self.vy = -2
                if self.y - self.r + self.vy <= 5:
                    self.vy = 0
                    
                self.y += self.vy
                    
            # The condition below is for when Faiza moves downwards
            elif self.key_handler[DOWN] == True:
                self.vy = 2
                if self.y + self.r + self.vy >= 762:
                    self.vy = 0  
                    
                self.y += self.vy
                    
            # If none of the up and down keys are being pressed, Faiza stops moving vertically
            else:
                self.vy = 0   

        # Animating Faiza by continuously iterating over each frame in it's sprite when Faiza is moving
        if frameCount%5 == 0 and (self.vx != 0 or self.vy != 0):
            self.frame = (self.frame + 1) % (self.num_frames - 1)
        # If Faiza is not moving, the frame where Faiza is still is displayed
        elif (self.vx == 0 and self.vy == 0):
            self.frame = 8 
      
        # For all the following blocks of code, self.alive is set to False when Faiza collides with any of these objects, and so Faiza returns to the starting position in that level
        # Also, the breakdown counter is incremented by 1 for every collision
        
        # Between levels 3 and 5, the following block checks for collisions with the pop quizzes; these pop quizzes remain within the main part of the maze/grid
        if game.level >= 3 and game.level <= 5:  
            for q in game.quizlist:
                if self.distance(q) <= self.r + q.r:
                    self.breakdown_cnt += 1
                    self.alive = False
     
        # Between levels 2 and 5, the following block checks for any collision with the first clock instantiated
        if game.level >= 2 and game.level <= 5:
            if self.distance(game.clock) <= self.r + game.clock.r:
                self.breakdown_cnt += 1
                self.alive = False
                
        # Between levels 4 and 5, the following block checks for any collision with the second clock instantiated
        if game.level == 4 or game.level == 5:
            if self.distance(game.clock2) <= self.r + game.clock2.r:
                self.breakdown_cnt += 1
                self.alive = False
        
        # For level 5, the following block checks for collisions with the third clock instantiated
        if game.level == 5:
            if self.distance(game.clock3) <= self.r + game.clock3.r:
                self.breakdown_cnt += 1
                self.alive = False
                
        # Between levels 6 and 10, the following block checks for collisions with the pop quizzes which can appear all over the screen
        # Also note that Level 5 onwards, as Faiza returns to the original position after a collision, the anxieties return to their original position too
        if game.level >= 6 and game.level <= 10:  
            for q in game.quizlist2:
                if self.distance(q) <= self.r + q.r:
                    self.breakdown_cnt += 1
                    self.alive = False
                    game.anxiety.alive = False
                    game.anxiety2.alive = False                    
                
        # For level 8, the following block of code checks for collisions with one assignment instantiated in level 8
        # Also note that in level 8-10 the assignment list is emptied as Faiza collides with any assignment
        if game.level == 8:  
            for a in game.assignments:
                if self.distance(a) <= self.r + a.r:
                    self.breakdown_cnt += 1
                    self.alive = False
                    game.anxiety.alive = False
                    game.anxiety2.alive = False
                    game.assignments = [] 
                    
        # For level 9, the following block of code checks for collisions with two assignments instantiated in level 9
        if game.level == 9:
            for a in game.assignments2:
                if self.distance(a) <= self.r + a.r:
                    self.breakdown_cnt += 1
                    self.alive = False
                    game.anxiety.alive = False
                    game.anxiety2.alive = False 
                    game.assignments2 = [] 
                    
        # For level 10, the following block of code checks for collisions with three assignments instantiated in level 10
        if game.level == 10:        
            for a in game.assignments3:
                if self.distance(a) <= self.r + a.r:
                    self.breakdown_cnt += 1
                    self.alive = False
                    game.anxiety.alive = False
                    game.anxiety2.alive = False 
                    game.assignments3 = []
        
        # For level 11, the following block of code checks if Faiza collides with any of the distractions and increments the distraction counter by 1 for every such collision
        if game.level == 11 and not(0 <= self.x <= 100 and 530 <= self.y <= 640):
            for d in game.distractions:
                if self.distance(d) <= self.r + d.r:
                    self.distraction_cnt += 1
                    self.alive = False
                    
        # Note: For Faiza's collision with anxiety, see the anxiety class
            
        # The following block checks for Faiza's collision with the brain for level 1-5 to increment the level and then reinstantiates relevant objects
        if (self.distance(game.brain) <= self.r + game.brain.r) and game.level <= 5:
            game.level += 1
            game.brain = Brain(980, 570, 30, 'brain_' + game.brain_images[random.randint(0,2)] + '.png', 85, 85, 2)
            game.clock = Clock(310, 330, 32, 'clock.png', 66, 66, 4, 270, 740)
            game.clock2 = Clock(695, 570, 32, 'clock.png', 66, 66, 4, 270, 740)
            game.clock3 = Clock(500, 440, 32, 'clock.png', 66, 66, 4, 270, 740)
            self.alive = False
            
        # The following block checks for Faiza's collision with the brain for level 6-10 to increment the level and then reinstantiates relevant objects 
        # (The brain is at a different position from level 1-5, hence a different block of code to reinstatiate objects relevantly)
        if (self.distance(game.brain2) <= self.r + game.brain2.r) and 6 <= game.level <= 10:    
            game.level += 1
            game.brain2 = Brain(980, 50, 30, 'brain_' + game.brain_images[random.randint(0,2)] + '.png', 85, 85, 2)
            self.alive = False
            game.anxiety.alive = False
            game.anxiety2.alive = False
            
        # The following block of code checks for Faiza's collision with the 4.0 GPA in the last level
        if self.distance(game.gpa) <= self.r + game.gpa.r and game.level == 11:
            game.level += 1
            
        # Incrementing x_shift in the Game class when Faiza in moving in the x-direction
        if self.x >= 0:
            game.x_shift += self.vx
                    
    # The following method checks for the distance between faiza and any other object
    # This is used multiple times above to check for a collision 
    def distance(self, target):
        return ((self.x - target.x) ** 2 + (self.y - target.y) ** 2) ** 0.5        
        
# Creating the obstacle Clock, which moves sideways within a certain x-range.
# Appears in levels 1-5
class Clock(Creature):
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames, xl, xr):
        Creature.__init__(self, x, y, r, img_name, img_w, img_h, num_frames)
        
        # xl and xr are the left and right x-boundaries respectively. The clock only moves within this range with a constant x-velocity (vx) of 3.
        self.xl = xl
        self.xr = xr
        self.vx = 3
        
        # Choosing a random starting direction and multiplying vx by -1 if it's direction is chosen to be left at the beginning.
        self.dir = random.choice([LEFT, RIGHT])
        if self.dir == LEFT:
            self.vx *= -1
    
    def update(self):
        # Animating the clock by continuously iterating over each frame in it's sprite.
        if frameCount%12 == 0:
            self.frame = (self.frame + 1) % self.num_frames
            
        # Making the clock change it's direction if it hits one of the boundaries
        if self.x - self.r <= self.xl:
            self.vx *= -1
            self.dir = RIGHT
        if self.x + self.r >= self.xr:
            self.vx *= -1
            self.dir = LEFT
            
        self.x += self.vx
        self.y += self.vy
        
# Creating the obstacle Quiz, which appears randomly within a specified area (more on this obstacle in the Game Class' __init__ and update methods)
# Appears in levels 3-10
class Quiz(Creature):
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames):
        Creature.__init__(self, x, y, r, img_name, img_w, img_h, num_frames)
    
    def update(self):
        # Animating the quiz by continuously iterating over each frame in its sprite.
        if frameCount%20 == 0:
            self.frame = (self.frame + 1) % self.num_frames

# Creating the obstacle Assignment, which is instantiated randomly at one of the 4 boundaries of the game's screen.
# First, it captures the position of Faiza, then locks those target coordinates (denoted by tx and ty) and is then fired towards them.
# Appears in levels 8-10
class Assignment(Creature):
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames, tx, ty):
        Creature.__init__(self, x, y, r, img_name, img_w, img_h, num_frames)
        
        # tx and ty represent the target coordinates of Faiza (at a particular instant). Here, we make use of angles in order to fire the Assignments towards Faiza.
        # dx and dy represent the x and y distances respectively between the target and the assignment's position.
        # We then calculate the angle using arctan(dy/dx) making sure we avoid the zero division error when dx = 0 
        self.tx = tx
        self.ty = ty
        self.dy = self.ty - self.y
        self.dx = self.tx - self.x
        
        # This is the resultant velocity with which the assignment will be fired towards the target
        self.v = 8
        
        # To avoid zero division error in self.angle:
        if self.dx == 0 and self.dy > 0:
            self.angle = radians(90)
        elif self.dx == 0 and self.dy < 0:
            self.angle = radians(270)
        else:
            self.angle = atan(float(self.dy)/float(self.dx))
            
    def update(self):
        # Animating the assignment by continuously iterating over each frame in it's sprite.
        if frameCount%20 == 0:
            self.frame = (self.frame + 1) % self.num_frames
            
        # Once we have the angle, we increment the assignment's x and y position using v*cos(angle) and v*sin(angle) respectively.  
        # We use the fact that cos(-x) = cos(x) and sin(-x) = -sin(x) and divide the possible directions of movement into cases:
        if self.dx == 0 and self.dy > 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx == 0 and self.dy < 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx > 0 and self.dy == 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx < 0 and self.dy == 0:
            self.x -= self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx > 0 and self.dy > 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx < 0 and self.dy < 0:
            self.x -= self.v * cos(self.angle)
            self.y -= self.v * sin(self.angle)
        if self.dx < 0 and self.dy > 0:
            self.x -= self.v * cos(self.angle)
            self.y -= self.v * sin(self.angle)
        if self.dx > 0 and  self.dy < 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
            
# Creating the obstacle Anxiety, which continuously follows Faiza wherever she goes. We use a method similar to the one we used for Assignments.
# Appears in levels 6-10
class Anxiety(Creature):
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames, tx, ty, tr):
        Creature.__init__(self, x, y, r, img_name, img_w, img_h, num_frames)
        
        # Here we make a 'dummy' object which is precisely mapped to Faiza's circle. It has it's separate keystroke functions which perfectly imitate 
        # Faiza's movements. This makes our task easier since everything is now handled within the Anxiety class. The 'dummy' object has of course, been
        # made invisible so that it seems Anxiety is always following Faiza. tx, ty, and tr represent the position and radius of the 'dummy' object respectively.
        self.tx = tx
        self.ty = ty
        self.tr = tr
        
        # We now make separate arrtibutes of vx, vy, dir, alive and key_handler for the 'dummy'. All of them exactly imitate Faiza.
        # There is also a self.v function for setting the velocity of Anxiety.
        self.vx = 0 
        self.vy = 0
        self.dir = RIGHT
        self.alive = True
        self.key_handler = {LEFT:False, RIGHT:False, UP:False, DOWN:False}
        self.v = 1.7
        
    def update(self):
        # Animating anxiety by continuously iterating over each frame in it's sprite.
        if frameCount%20 == 0:
            self.frame = (self.frame + 1) % self.num_frames
            
        # All of the upcoming key handling conditions have been copied from Faiza's class (for level 6 onwards) in order to match the dummy's movements with Faiza.
        if self.key_handler[LEFT] == True:
            self.vx = -2
            self.dir = LEFT
            if self.tx - self.tr + self.vx < 6:
                self.vx = 0
            self.tx += self.vx

        elif self.key_handler[RIGHT] == True:
            self.vx = 2
            self.dir = RIGHT
            if self.tx + self.tr + self.vx > 1018:
                self.vx = 0
            self.tx += self.vx
            
        else:
            self.vx = 0
            
        if self.key_handler[UP] == True:
            self.vy = -2
            if self.ty - self.tr + self.vy <= 5:
                self.vy = 0
            self.ty += self.vy
            
        elif self.key_handler[DOWN] == True:
            self.vy = 2
            if self.ty + self.tr + self.vy >= 762:
                self.vy = 0
            self.ty += self.vy
    
        else:
            self.vy = 0
            
        # We now calculate dx and dy for the difference in x and y positions between Anxiety and the 'dummy' respectively,
        # then we calculate angle between them, and increment x and y by v*cos(angle) and v*sin(angle) respectively as we
        # did for assignments, but this time the angle changes continuously as Faiza (and the dummy) move, hence, Anxiety
        # continously follows Faiza.
        
        self.dy = self.ty - self.y
        self.dx = self.tx - self.x
        
        # to avoid zero division error in self.angle:
        if self.dx == 0 and self.dy > 0:
            self.angle = radians(90)
        if self.dx == 0 and self.dy < 0:
            self.angle = radians(270)
        else:
            self.angle = atan(float(self.dy)/float(self.dx))
            
        # using the fact that cos(-x) = cos(x) and sin(-x) = -sin(x):
        if self.dx == 0 and self.dy > 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx == 0 and self.dy < 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx > 0 and self.dy == 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx < 0 and self.dy == 0:
            self.x -= self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx > 0 and self.dy > 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
        if self.dx < 0 and self.dy < 0:
            self.x -= self.v * cos(self.angle)
            self.y -= self.v * sin(self.angle)
        if self.dx < 0 and self.dy > 0:
            self.x -= self.v * cos(self.angle)
            self.y -= self.v * sin(self.angle)
        if self.dx > 0 and  self.dy < 0:
            self.x += self.v * cos(self.angle)
            self.y += self.v * sin(self.angle)
            
        # Since Anxiety is following the 'dummy', we have to take into account the collision between the dummy and Anxiety
        # and set both the dummy's and Faiza's alive attributes to False.
        if (self.distance() <= self.r + self.tr) and (6 <= game.level <= 10):
            self.alive = False
            game.faiza.breakdown_cnt += 1
            game.faiza.alive = False
                            
    # defining the distance method for calculating the distance between Anxiety and the dummy            
    def distance(self):
        return ((self.x - self.tx)**2 + (self.y - self.ty)**2) ** 0.5 
            
    # We slightly modify the display function for Anxiety since we don't want the text beneath Anxiety's image to be inverted when anxiety moves leftwards    
    def display(self):
        self.update()
        
        if self.dir == RIGHT or self.dir == LEFT:
            image(self.img, self.x - self.img_w//2, self.y - self.img_h//2, self.img_w, self.img_h, self.frame * self.img_w, 0, (self.frame + 1) * self.img_w, self.img_h)

# Creating the Brain class which appears in levels 1-10 which represents the mental health
class Brain(Creature):
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames):
        Creature.__init__(self, x, y, r, img_name, img_w, img_h, num_frames)
        
    def update(self):
        # Animating the brain by continuously iterating over each frame in it's sprite.
        if frameCount%20 == 0:
            self.frame = (self.frame + 1) % self.num_frames 
            
# Creating the distractions class which represents different distractions which appear in level 11
class Distractions(Creature):
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames):
        Creature.__init__(self, x, y, r, img_name, img_w, img_h, num_frames)
        # all distractions are instantiated with random speeds within a certain limit
        self.vx = random.randint(2,5)
        self.vy = -1 * (random.randint(2,5))
        
    def update(self):
        # Animating some distractions by continuously iterating over each frame in their sprites.
        if frameCount%12 == 0:
            self.frame = (self.frame + 1) % self.num_frames
        
        # setting conditions for rebounding the distractions when they hit the corners of the screen
        if self.x + self.r >= 1024:
            self.vx *= -1
        if self.x - self.r <= 0:
            self.vx *= -1
        if self.y - self.r <= 10:
            self.vy *= -1
        if self.y + self.r >= 780:
            self.vy *= -1
        
        self.x += self.vx
        self.y += self.vy
            
# Creating the GPA class which appears in level 11
class GPA(Creature):
    def __init__(self, x, y, r, img_name, img_w, img_h, num_frames):
        Creature.__init__(self, x, y, r, img_name, img_w, img_h, num_frames)
        
    def update(self):
        # Animating anxiety by continuously iterating over each frame in it's sprite.
        if frameCount%20 == 0:
            self.frame = (self.frame + 1) % self.num_frames      
        
class Game():
    def __init__(self,w,h):
        # w and h represent the width and height of the screen window respectively. x_shift will be used to move the background image when 
        # Faiza is moving with some x-velocity and self.level represents the initial level and is incremented as the game progresses.
        self.w = w
        self.h = h
        self.x_shift = 0
        self.level = 0
        
        # Creating lists for quizzes, assignments and distractions. Separate lists for the same object type have been 
        # made to accomodate different features for the objects in different levels. For example quizlist stores the
        # quiz objects to be displayed in levels 2-5 whereas quizlist2 does the same for levels 6-10.
        
        self.quizlist = []
        self.quizlist2 = []
        self.assignments = []
        self.assignments2 = []
        self.assignments3 = []
        self.distractions = []
        
        # Instantiating game objects and storing them in lists where necessary.
        self.faiza = Faiza(34, 585, 27, 'faiza.png', 66, 66, 9)
        self.clock = Clock(310, 330, 32, 'clock.png', 66, 66, 4, 270, 740)
        self.clock2 = Clock(695, 570, 32, 'clock.png', 66, 66, 4, 270, 740)
        self.clock3 = Clock(500, 440, 32, 'clock.png', 66, 66, 4, 270, 740)
        self.quiz = Quiz(random.randint(300,710), random.randint(300,590), 25, 'quiz.png', 66, 66, 3)
        self.quizlist.append(self.quiz)
        self.quiz2 = Quiz(random.randint(120,994), random.randint(130,738), 25, 'quiz.png', 66, 66, 3)
        self.quizlist2.append(self.quiz2)
        self.anxiety = Anxiety(500, 500, 25, 'anxiety.png', 66, 66, 3, 34, 585, self.faiza.r)
        self.anxiety2 = Anxiety(1000, 700, 25, 'anxiety.png', 66, 66, 3, 34, 585, self.faiza.r)
        self.brain_images = ['weights', 'bulb', 'waving']
        self.brain = Brain(980, 570, 30, 'brain_waving.png', 85, 85, 2)
        self.brain2 = Brain(980, 50, 30, 'brain_' + self.brain_images[random.randint(0,2)] + '.png', 85, 85, 2)
        self.gpa = GPA(990, 35, 25, 'gpa.png', 70, 56, 1)
        
        # loading different images which will appear in backgrounds
        self.img = loadImage(path + "/images/background1.png")
        self.final_bg = loadImage(path + "/images/final_background.png")
        self.start_bg = loadImage(path + "/images/start_background.png")
        self.over_bg = loadImage(path + "/images/gameover_background.png")
        # loading different songs which will play in the background
        self.background_sound = player.loadFile(path + "/sounds/background.mp3")
        self.intro_sound = player.loadFile(path + "/sounds/intro.mp3")
        # playing the intro song when level 0 (introduction screen) is displayed
        self.intro_sound.rewind()
        self.intro_sound.loop()
        
        # instantiating 6 different distractions and appending them to a list
        self.distractions.append(Distractions(100, 300, 58, 'jake.png', 120, 120, 6))
        self.distractions.append(Distractions(444, 333, 48, 'insta.png', 100, 100, 1))
        self.distractions.append(Distractions(900, 120, 48, 'facebook.png', 100, 100, 1))
        self.distractions.append(Distractions(887, 635, 48, 'netflix.png', 100, 100, 1))
        self.distractions.append(Distractions(134, 587, 48, 'youtube.png', 100, 100, 1))
        self.distractions.append(Distractions(55, 100, 48, 'ps.png', 120, 120, 1))
        
    def update(self):
        # Sending Faiza back to her original position when faiza.alive == False and then setting faiza.alive to True again
        if self.faiza.alive == False:
            self.faiza.x = 34
            self.faiza.y = 585
            self.faiza.alive = True
            
        # Creating a 'position list' from which the starting coordinates of assignments will be fetched each time an Assignment is instantiated
        # The 4 lists inside position_list represent the top, right, bottom and left walls of the screen respectively and are made to randomly choose
        # an x or y coordinate from a specified range according to the wall they represent.
        position_list = [[random.randint(30,994), 30], [994, random.randint(150,730)], [random.randint(30,994), 730], [30, random.randint(150,400)]]
        
        # We now separate our cases by levels so that in level 8, one Assignment is instantiated at regular intervals, and the same is done for levels 9 and 10
        # having 2 and 3 Assignments instantiated together respectively at regular intervals as well
        # rand_int, rand_int2, and rand_int3 are used to generate 3 random integers from 0-3 in order to randomly select a wall from position_list and assign
        # random x and y coordinates to the assignment(s) according to the level
                 
        if self.level == 8:
            rand_int = random.randint(0,3)
            if frameCount%200 == 0:
                self.assignments.append(Assignment(position_list[rand_int][0], position_list[rand_int][1], 30, 'assignment.png', 66, 66, 4, self.faiza.x, self.faiza.y))
                    
        elif self.level == 9:
            rand_int = random.randint(0,3)
            rand_int2 = random.randint(0,3)
            if frameCount%200 == 0:
                self.assignments2.append(Assignment(position_list[rand_int][0], position_list[rand_int][1], 30, 'assignment.png', 66, 66, 4, self.faiza.x, self.faiza.y))
            if frameCount%201 == 0:
                self.assignments2.append(Assignment(position_list[rand_int2][0], position_list[rand_int2][1], 30, 'assignment.png', 66, 66, 4, self.faiza.x, self.faiza.y))
                    
        elif self.level == 10:
            rand_int = random.randint(0,3)
            rand_int2 = random.randint(0,3)
            rand_int3 = random.randint(0,3)
            if frameCount%200 == 0:
                self.assignments3.append(Assignment(position_list[rand_int][0], position_list[rand_int][1], 30, 'assignment.png', 66, 66, 4, self.faiza.x, self.faiza.y))
            if frameCount%201 == 0:
                self.assignments3.append(Assignment(position_list[rand_int2][0], position_list[rand_int2][1], 30, 'assignment.png', 66, 66, 4, self.faiza.x, self.faiza.y))
            if frameCount%202 == 0:
                self.assignments3.append(Assignment(position_list[rand_int3][0], position_list[rand_int3][1], 30, 'assignment.png', 66, 66, 4, self.faiza.x, self.faiza.y))
                            
        # Resetting the position of the Anxieties when anxiety.alive or anxiety2.alive are False
        if self.anxiety.alive == False or self.anxiety2.alive == False:
            self.anxiety.x = 500
            self.anxiety2.x = 1000
            self.anxiety.tx = 34
            self.anxiety2.tx = 34
            self.anxiety.y = 500
            self.anxiety2.y = 700            
            self.anxiety.ty = 585
            self.anxiety2.ty = 585
            self.anxiety.alive = True
            self.anxiety2.alive = True
        
        # Clearing the quizlists at regular intervals and instantiating a new quiz at anotrher random location. Quizzes in levels 6-10 are made to appear and disappear 
        # more frequently in order to increase the difficulty
        if frameCount%300 == 0:
            for q in self.quizlist:
                self.quizlist.remove(q)
            self.quizlist.append(Quiz(random.randint(300,710), random.randint(300,590), 30, 'quiz.png', 66, 66, 3))
            
        if frameCount%150 == 0:
            for q in self.quizlist2:
                self.quizlist2.remove(q)
            self.quizlist2.append(Quiz(random.randint(120,994), random.randint(130,738), 25, 'quiz.png', 66, 66, 3))
    
    def display(self):
        self.update()
        
        # displaying the intro screen background
        if self.level == 0:
            image(self.start_bg, 0, 0)
        
        # Moving the background image when Faiza is moving in the x-direction
        if 1 <= self.level <= 10:
            x = 0
            x = self.x_shift
                
            width_right = x % self.w
            width_left = self.w - width_right
            
            image(self.img, 0, 0, width_left, self.h, width_right, 0, self.w, self.h)
            image(self.img, width_left, 0, width_right, self.h, 0, 0, width_right, self.h)   
            
        # displaying the final level background
        if self.level == 11:
            image(self.final_bg, 0, 0)
            
        # displaying the final screen once the game is over
        if self.level == 12:
            image(self.over_bg, 0, 0)
        
        # creating the grid using lines which is displayed in levels 1-5
        if 0 < self.level <= 5:
            stroke(0, 0, 0)
            strokeWeight(7)
            line(0, 100, 1024, 100)
            line(0, 115, 1024, 115)
            strokeWeight(9)
            line(0, 280, 120, 280)
            line(120, 280, 120, 390)
            line(120, 390, 270, 390)
            line(270, 280, 270, 390)
            line(120, 490, 270, 490)
            line(0, 620, 120, 620)
            line(120, 490, 120, 620)
            line(270, 490, 270, 620)
            line(270, 280, 650, 280)
            line(650, 280, 650, 160)
            line(270, 620, 750, 620)
            line(750, 620, 750, 250)
            line(750, 250, 820, 250)
            line(820, 250, 820, 620)
            line(650, 160, 920, 160)
            line(920, 160, 920, 520)
            line(920, 520, 1024, 520)
            line(820, 620, 1024, 620)       
            
        # displaying text for the introductory screen    
        if self.level == 0:
            textSize(80)
            text("UNI SUFFERERS", 230, 80) 
            textSize(40)
            fill(255, 213, 43)
            text("Press the space bar to begin playing!", 180, 650)
            
        # displaying text for the 'game over' screen    
        if self.level == 12:
            textSize(150)
            fill(255, 0, 0)
            text("GAME", 270, 220) 
            text("OVER", 290,350)
            textSize(30)
            text("{} breakdowns and {} distractions later,".format(self.faiza.breakdown_cnt, self.faiza.distraction_cnt), 240, 550)
            text("you finally got that 4.0 GPA!", 240, 590)
            fill(255, 213, 43)
            text("Think you can do better? Click on the", 240, 650)
            text("screen to play again!", 240, 690)
            
                 
        # displaying text for the labels of different levels
        textSize(40)
        fill(75, 0, 70)
        if self.level == 1:
            text("GO SAVE YOUR MENTAL HEALTH!", 180, 70)
        elif self.level == 2:
            text("5 AM CLASSES ARE WAITING!", 210, 70)
        elif self.level == 3:
            text("TOO EASY? LET'S POP THINGS UP!", 170, 70)
        elif self.level == 4:
            text("HAVE MORE OF IT!", 290, 70)
        elif self.level == 5:
            text("AND MORE!", 360, 70)
        elif self.level == 6:
            textSize(35)
            text("SOME THINGS JUST WON'T STOP FOLLOWING YOU", 65, 60)
        elif self.level == 7:
            text("THIS AIN'T GETTING ANY BETTER", 150, 65)
        elif self.level == 8:
            text("WAIT, WHAT? ASSIGNMENT?", 210, 65)
        elif self.level == 9:
            text("WHAT? THERE WERE TWO?", 230, 65)
        elif self.level == 10:
            text("YOU'RE KIDDING ME...", 270, 65)
        elif self.level == 11:
            textSize(40)
            fill(255, 213, 43)
            text("GO, GET THAT 4.0 GPA!", 270, 65)
        
        # using a number of different conditions to call the display functions of all objects according to the level they are supposed to appear in
        if 0 < self.level <= 5:
            self.brain.display()
        if 0 < self.level <= 11:
            self.faiza.display()
        if self.level >= 3 and self.level <= 5:
            for q in self.quizlist:
                q.display()
        if self.level >= 2 and self.level <= 5:
            self.clock.display()
        if self.level == 4 or self.level == 5:
            self.clock2.display()
        if self.level == 5:
            self.clock3.display()
        # if self.level >= 6 and self.level <= 10:
        if self.level >= 6 and self.level <= 10:
            self.brain2.display()        
        if self.level >= 6 and self.level <= 10:
            for q in self.quizlist2:
                q.display()            
        if self.level >= 6 and self.level <= 10:
            self.anxiety.display()
        if self.level >= 7 and self.level <= 10:
            self.anxiety2.display()
        if self.level == 8:
            for a in self.assignments:
                a.display()
        if self.level == 9:
            for a in self.assignments2:
                a.display()            
        if self.level == 10:
            for a in self.assignments3:
                a.display()
        if self.level == 11:
            for d in self.distractions:
                d.display()
            self.gpa.display()
        
game = Game(1024, 768)

def setup():
    size(1024, 768)
    
def draw():
    background(255, 255, 255)
    game.display()
    
# Defining keyPressed and keyReleased for Faiza and the 'dummies' in Anxiety and Anxiety2:
def keyPressed():
    if keyCode == 32 and game.level == 0:
        game.level = 1
        game.intro_sound.close()
        game.background_sound.rewind()
        game.background_sound.loop()
    
    if keyCode == LEFT:
        game.faiza.key_handler[LEFT] = True
        game.anxiety.key_handler[LEFT] = True
        game.anxiety2.key_handler[LEFT] = True
    elif keyCode == RIGHT:
        game.faiza.key_handler[RIGHT] = True
        game.anxiety.key_handler[RIGHT] = True
        game.anxiety2.key_handler[RIGHT] = True
    elif keyCode == UP:
        game.faiza.key_handler[UP] = True
        game.anxiety.key_handler[UP] = True
        game.anxiety2.key_handler[UP] = True
    elif keyCode == DOWN:
        game.faiza.key_handler[DOWN] = True
        game.anxiety.key_handler[DOWN] = True
        game.anxiety2.key_handler[DOWN] = True
        
def keyReleased():
    if keyCode == LEFT:
        game.faiza.key_handler[LEFT] = False
        game.anxiety.key_handler[LEFT] = False
        game.anxiety2.key_handler[LEFT] = False
    elif keyCode == RIGHT:
        game.faiza.key_handler[RIGHT] = False
        game.anxiety.key_handler[RIGHT] = False
        game.anxiety2.key_handler[RIGHT] = False
    elif keyCode == UP:
        game.faiza.key_handler[UP] = False
        game.anxiety.key_handler[UP] = False
        game.anxiety2.key_handler[UP] = False
    elif keyCode == DOWN:
        game.faiza.key_handler[DOWN] = False
        game.anxiety.key_handler[DOWN] = False     
        game.anxiety2.key_handler[DOWN] = False

# Defining mouseClicked in order to restart the game after the mouse has been clicked in the 'Game Over' screen
def mouseClicked():
    if game.level == 12:
        game.background_sound.close()
        global game
        game = Game(1024, 768)
