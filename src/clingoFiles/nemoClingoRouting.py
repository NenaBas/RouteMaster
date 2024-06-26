# Step 1. Specify initial parameters: what types of optimizations, how many models to generate
# Step 2. Assert in clingo the instance of the problem to solve, using the getInputData()
# Step 3. Ground and solve the ASP problem
# Step 4. Parse the output, using the parseOutput() 





from clingo import Control
from clingo.symbol import Number
import os
import time
import requests


#%% Starting Parameters

# Change the working directory to the script path
script_dir = os.path.dirname(os.path.realpath(__file__))
os.chdir(script_dir)
# Print the current working directory
print("Current working directory:", os.getcwd())

# Use the full file path
filepath = os.path.join(script_dir, "nemoRouting4AdoXX.lp")
# filepath = "nemoRouting4AdoXX.lp"
print("Filepath:", filepath)

##### specify which constraints/optimizations to consider
# Minimize jobs not served?
# This is always true now
#minimizeJobsNotServed = True;

# Minimize time to complete all routes?
minimizeTimepointForAllPlansToEnd = False;

# Specify how many answersets to get. 0 - all, otherwise any integers greater than 0
numOfModels = 1

#The time needed to serve a node
serviceTime = 4

# Use debugMode to print information at different steps
debugMode = True

# True if we do not want a timeout to happen
optimalityGuarranteed = True

# Use if you wish to also retrieve suboptimal solutions incementally
incremental = True
#timeoutThreshold = 5 # will only work if optimalityGuarranteed is FALSE - still not checked though




#%% Output
def parseOutput(answerset):
    if (len(answerset)>0):
        listOfPreds = answerset.split(' ')
        
        planOfRoutes = []
        
        
        for pred in listOfPreds:
            if (pred.startswith("arrivesAt(")):
                #print('>>>'+pred)
                argumentsStr = pred[pred.index("(")+1:-1]
                argumentsList = argumentsStr.split(',')
                if (int(argumentsList[3]) < 0):
                    argumentsList[3] = '0'
                if debugMode:
                    print(argumentsList)
                
                planOfRoutes.append(argumentsList)
                #planOfRoutes.append("{vehicle:"+argumentsList[0]+",stop:"+argumentsList[1]+",step:"+argumentsList[2]+",arrivesAt:"+argumentsList[3]+"}")
            elif debugMode and (pred.startswith("moveTo(")):
                #argumentsStr = pred[pred.index("(")+1:-1]
                print(pred)
        planOfRoutes.sort() 
        #print(planOfRoutes)

        #print(listOfPreds)
    
    
    #print(answerset)
    return planOfRoutes





#%% Call the service to retrieve nodes, vehicles and distances
#   Return a string containing all ASP facts

def getInputData():

    try:
        response = requests.get('http://139.91.183.121/neo4j/retrieveASPrules')
        # if request was successful
        if response.status_code == 200:
            data = response.json()  # response in json format
            # Retrieve 'rulesString' value
            aspFacts = data.get('rulesString')
            print('-----RULES-----')
            print(aspFacts)
            if aspFacts is not None:
                return aspFacts
            else:
                return "rulesString not found in the response!"
        else:
            return f"Failed to fetch data. Status code: {response.status_code}"
    except requests.RequestException as e:
        return f"An error occurred while trying to fetch data: {e}"





#%% Main


print("Fetching problem instance...")
# Call the service to retrieve nodes, vehicles and distances
problemInstance = getInputData()
if "Failed" in problemInstance or "error" in problemInstance:
    print("------------ProblemInstance retrieval failure------------\n", problemInstance)



print("Initializing Clingo...")
ctl = Control(["0"])


# Specify optimaziation aspects
    # If we do not use the optN parameter, then we get a single optimal answer (the last one)
    # With optN activated, we get all optimal answers. We can also choose to get N optimal answers    
if (optimalityGuarranteed) :
    ctl.configuration.solve.opt_mode = 'optN'
    ctl.configuration.solve.models = numOfModels


ctl.load(filepath)
ctl.add("base", [], problemInstance)
ctl.add("base", [], "serviceTime(X, "+str(serviceTime)+") :- node(X).")

#if (minimizeJobsNotServed):
#    ctl.add("base", [], "#minimize{N@5 : numOfUnservedJobs(N)}.")

if (minimizeTimepointForAllPlansToEnd):
    ctl.add("base", [], "#minimize{N@1 : planEndsAtTimepoint(N)}.")

start = time.time()
ctl.ground([("base", [])])
end = time.time()
print('Grounding time: ', round(end - start,2), 'sec')    



start = time.time()
if (optimalityGuarranteed):
    with ctl.solve(yield_=True) as hnd:
        if hnd.get().unsatisfiable:
            print("UNSAT: The problem instance is unsatisfiable")
            result = "[]"
        for m in hnd:
            if (incremental) or (m.optimality_proven):
                if debugMode:
                    print('Answer set:')
                    print('Optimal: ', m.optimality_proven)
                    print(m)
                result = parseOutput(str(m))
                if debugMode:
                    print(result)
                    print(hnd.get())
else:
    with ctl.solve(on_model=print, async_=True) as hnd:

        hnd.wait(3.0) #does not seem to work, unknown why.. 
        print('Test test:', hnd.get())
        for m in hnd:
            if (incremental) or (m.optimality_proven):
                if debugMode:
                    print('Answer set:')
                    print('Optimal: ', m.optimality_proven)
                    print(m)
                result = parseOutput(str(m))
                if debugMode:
                    print(result)
                    print(hnd.get())
    
    
    
# with ctl.solve(yield_=True) as hnd:
# #with ctl.solve(on_model=print, async_=True) as hnd:

# #    hnd.wait()
# #    print('Test test:', hnd.get())
#     for m in hnd:
# #        if (m.optimality_proven):
#             if debugMode:
#                 print('Answer set:')
#                 print('Optimal: ', m.optimality_proven)
#                 print(m)
#             result = parseOutput(str(m))
#             if debugMode:
#                 print(result)
#                 print(hnd.get())
    


end = time.time()
print('Solving time: ', round(end - start,2), 'sec')    

