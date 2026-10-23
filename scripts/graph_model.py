#!/usr/bin/env python3
"""Independent shortest-route graph specification (not browser logs)."""
from collections import deque
import csv
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
conditions = {'U1':(False,False),'U2':(True,False),'U3':(False,True),'U4':(True,True)}

def edges(direct, review):
    graph={'S0':[('evidence_open','S1_OPTIONAL')],
           'S1_OPTIONAL':[('back','S0')],
           'M1':[('contest_entry','S2')],
           'S1_REQUIRED':[('review_complete','R1'),('back','S0')],
           'R1':[('final_accept','S3'),('back','S0')],
           'S2':[('reason_select','S2R'),('back','S0')],
           'S2R':[('contest_submit','S4'),('back','S0')]}
    graph['S0'] += [('contest_entry','S2')] if direct else [('menu_open','M1')]
    graph['S0'] += [('accept_click','S1_REQUIRED')] if review else [('accept_click','S3')]
    return graph

def shortest(graph,start,goal):
    queue=deque([(start,[])]);visited={start}
    while queue:
        node,path=queue.popleft()
        if node==goal:return path
        for action,nxt in graph.get(node,[]):
            if nxt not in visited:
                visited.add(nxt);queue.append((nxt,path+[(action,nxt)]))
    raise ValueError(f'Unreachable: {goal}')

def write_reference():
    rows=[]
    for ui,(direct,review) in conditions.items():
        graph=edges(direct,review)
        for action,goal in [('accept','S3'),('contest','S4')]:
            path=shortest(graph,'S0',goal)
            rows.append({'ui':ui,'action':action,'shortest_clicks':len(path),'route':'S0 -> '+' -> '.join(s for _,s in path)})
            print(ui,action,len(path),rows[-1]['route'])
    out=ROOT/'results'/'graph_expected.csv';out.parent.mkdir(exist_ok=True)
    with out.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    print('Structural reference saved to',out)


if __name__ == '__main__':
    write_reference()
