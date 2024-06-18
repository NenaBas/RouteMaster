%../exec/clingo5_4 nemoRouting2.lp 0 --opt-mode=optN --quiet=1


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Nodes






%distance(Y,X,N) :-
%	distance(X,Y,N).

%distance(X,X,0) :-
%	node(X).


% The time needed to stay at a node, in order to serve the job
%% Added through python
%serviceTime(X, 3) :-
%	node(X).

% Temporal constraints - both work ok!
%startTimeNode(2,6).
%endTimeNode(2,7).


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Vehicles


%vehicle(v1).
%capacity(v1, 2).
%startNode(v1,1).
%endNode(v1,1).



%vehicle(v2).
%capacity(v2, 2).
%startNode(v2, 1).






%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Step 1. Assign jobs to vehicles - generate many combinations


%%%% New addition of rules
possibleValuesForCapacity(V, 0..C) :-
	capacity(V, C).

% produce all possible lower bounds per vehicle, but one per answerset
1{numOfPlanStepsToMake(V, N): possibleValuesForCapacity(V, N)}1 :-
	vehicle(V).

% maximize the lowerBounds
#maximize{N@6,V : numOfPlanStepsToMake(V, N)}.

% Assign as many jobs as the capacity of the vehicle
Bound{assignJob(V,N): node(N)}Bound :-
	numOfPlanStepsToMake(V, Bound).

%%%%


% Assign as many jobs as the capacity of the vehicle
%%{assignJob(V,N): node(N)}Cap :-
%%	vehicle(V), capacity(V,Cap).

% Only one vehicle can serve a job
:- assignJob(V1, N), assignJob(V2, N), V1 != V2.





%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Step 2. For the jobs assigned, generate possible routes to serve them


routeLength(V, Num) :-
	vehicle(V),
	Num = #count{N,V : assignJob(V,N)}.
	%Num > 0. % Not needed - if no job assigned, the body of the rule is false

step(V, 1..L) :-
	routeLength(V, L).


 
% Generate routes
Length{moveTo(V, Node, Step) :  step(V, Step), assignJob(V, Node) }Length :-
	%vehicle(V), 	
	routeLength(V,Length).

:- assignJob(V, N), not moveTo(V,N,_).
:- step(V,N), not moveTo(V,_,N).





%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% Step 3. Calculate route duration

% Recursion %%%%
% The next rule is when there is no earliest time for the destination node

arrivesAt(V, Node2, Step+1, Timepoint_N1+Dist+ServTime) :-
	arrivesAt(V, Node1, Step, Timepoint_N1),
	moveTo(V, Node2, Step+1),
	Node1 != Node2,
	not startTimeNode(Node2,_),  %%% arrive at any time
	distance(Node1, Node2, Dist),
	serviceTime(Node, ServTime).

% The next rule is when there is earliest time for the destination node
arrivesAt(V, Node2, Step+1, Tearliest) :-
	arrivesAt(V, Node1, Step, Timepoint_N1),
	moveTo(V, Node2, Step+1),
	Node1 != Node2,
	startTimeNode(Node2, StartTimeNode2),  
	distance(Node1, Node2, Dist),
	serviceTime(Node, ServTime),
	Tearliest = #max{StartTimeNode2 ; Timepoint_N1+Dist+ServTime}.



%%% Next, we consider the situation when a starting node for a vehicle
%%% has / has not been specified

% No starting node has been declared
%%% The first node can be served right away
arrivesAt(V, Node, 1, 0) :-
	moveTo(V, Node, 1),
	not startNode(V, _),
	not startTimeNode(Node, _).

%%% The first node can be served when it is available
arrivesAt(V, Node, 1, StartTimeNode) :-
	moveTo(V, Node, 1),
	not startNode(V, _),
	startTimeNode(Node, StartTimeNode).

% The starting node is not the first step of the plan
% Note that we do not have to check nodeStartTime, 'cause this is just a passby node
arrivesAt(V, Node, 0, -ServTime) :-
	startNode(V, Node), 
	not moveTo(V, Node, 1),
	serviceTime(Node, ServTime).

% The starting node happens to also be the first step of the plan
arrivesAt(V, Node, 1, 0) :-
	startNode(V, Node), 
	moveTo(V, Node, 1),
	not startTimeNode(Node, _).

arrivesAt(V, Node, 1, StartTimeNode) :-
	startNode(V, Node), 
	moveTo(V, Node, 1),
	startTimeNode(Node, StartTimeNode).


%%% Next, I need to also include the situation when
%%% an ending node is specified (just add the extra distance)


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% A vehicle should not serve a node before its start time
:- arrivesAt(_, Node, Step, Tarrives),
	Step > 0, 
	startTimeNode(Node, Tstart), 
	Tarrives < Tstart.


% A vehicle should not serve a node after its end time
:- arrivesAt(_, Node, _, Tarrives), 
	endTimeNode(Node, Tend), 
	Tarrives > Tend.


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

jobNotServed(N) :-
	node(N), not assignJob(_,N).


numOfUnservedJobs(Num) :-
	 Num = #count{N : jobNotServed(N)}.


%#minimize{N@5 : numOfUnservedJobs(N)}.


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Calculate distances

% We may not need this at all...
%distanceTraveledWithoutEndNode(V, Tmax) :-
%distanceTraveled(V, Tmax) :-
%	routeLength(V, MaxStep),
%	Tmax = #max{N,V,Node,MaxStep : arrivesAt(V,Node,MaxStep,N)}.

% Works ok, even when the end node is the same as the last node of the plan
routeDuration(V, Dist+Tend+ServTime) :-
		endNode(V,Node1),
		routeLength(V, MaxStep),
		arrivesAt(V,Node2,MaxStep,Tend),
		distance(Node2,Node1,Dist),
		serviceTime(Node2, ServTime).

routeDuration(V, Tend+ServTime) :-
		routeLength(V, MaxStep),
		not endNode(V,_),
		arrivesAt(V,Node,MaxStep,Tend),
		serviceTime(Node, ServTime).


% When the endNode is not part of the plan, we add it in the results
% Need to doublecheck - we can just remove it without affecting anything else 
% (durations are calculated correctly without it)
arrivesAt(V, Node1, MaxStep+1, Tend+Dist+ServTime) :-
		endNode(V, Node1),
		routeLength(V, MaxStep),
		arrivesAt(V,Node2,MaxStep,Tend),
		Node1 != Node2,
		distance(Node2,Node1,Dist),
	    serviceTime(Node2, ServTime).


totalBusyTime(TotalDist) :-
	TotalDist = #sum{ Tmax, V: routeDuration(V, Tmax)}.

planEndsAtTimepoint(TimepointMax) :-
	TimepointMax = #max{ Tmax, V: routeDuration(V, Tmax)}.

%#minimize{N@1 : planEndsAtTimepoint(N)}.




%#show assignJob/2.
%#show jobNotServed/1.
%#show numOfUnservedJobs/1.
%#show steps/2.
#show moveTo/3.
#show arrivesAt/4.
#show numOfUnservedJobs/1.
#show routeDuration/2.
#show totalBusyTime/1.
#show planEndsAtTimepoint/1.

