# THE FORMULAS
Algorithm to calculate ratings change for a game against a given opponent:

 1. Before a game, calculate initial rating and RD for each player.

     o If no games yet, initial rating assumed to be 1720. Otherwise, use
       existing rating. (The 1720 is not printed out, however.)
     o If no RD yet, initial RD assumed to be 350 if you have no games, or 70
       if your rating is carried over from ICC. Otherwise, calculate new RD,
       based on the RD that was obtained after the most recent game played,
       and on the amount of time (t) that has passed since that game, as
       follows:
       RD' = Sqrt(RD^2 + ct)
       where c is a numerical constant chosen so that predictions made
       according to the ratings from this system will be approximately
       optimal.

 2. Calculate the "attenuating factor" for use in later steps.

               For normal chess, this is given by
                           f =  1/Sqrt(1 + p RD^2)
      
               Here, RD is your opponent's RD, and p is the constant
                                   3 (ln 10)^2
                            p =  -------------
                                  Pi^2 400^2   .
      
               For bughouse, we use
                   f =  1/Sqrt(1 + p (RD1^2 + RD2^2 + RD3^2))
               where RD1, RD2 and RD3 are the RD's of the other three
               players involved in the game, and p is given by
                                  3 (ln 10)^2
                            p =  -------------
                                  Pi^2 800^2   .
      
               Note that this is between 0 and 1 - if RD is very big,
               then f will be closer to 0.

 3. Get E (expected outcome?)
      r1 <- your rating,

      r2 <- opponent's rating,
          (in bughouse, r1 is the average of your rating and your
          partner's rating, and r2 is the average of your opponents'
          ratings)
                    1
       E <-  ----------------------
                    -(r1-r2)*f/400     <- it has f(RD) in it!
              1 + 10
 
          This quantity E seems to be treated kind of like a probability.

 4. BEGIN-PRE

                   K =               q*f
                       --------------------------------------
                        1/(RD)^2   +   q^2 * f^2 * E * (1-E)
          
                   where q is a mathematical constant:
                                q = (ln 10)/400 (normal chess),
                                q = (ln 10)/800 (bughouse).
                   NOTE: if K is less than 16, we use 16 instead.

 5. This is the K factor for the game, so

             Your new rating = (pregame rating) + K * (w - E)
    
             where w is 1 for a win, 0.5 for a draw, and 0 for a loss.
 
 6. Your new RD is calculated as

           RD' =                     1
                   -------------------------------------------------
                   Sqrt(    1/(RD)^2   +   q^2 * f^2 * E * (1-E)   )  . 

The same steps are done for your opponent.

# FURTHER INFORMATION

A PostScript file containing Mark Glickman's paper discussing this ratings
system may be obtained via ftp. The ftp site is hustat.harvard.edu, the
directory is /pub/glickman, and the file is called "glicko.ps". It is
available at http://hustat.harvard.edu/pub/glickman/glicko.ps.

# CREDITS

The Glicko Ratings System was invented by Mark Glickman, Ph.D. who is
currently at Boston University. This text was copy pasted from the FICS 
(freechess.org) `ratings` help page
 
