import React from 'react';
import Team from './Team.react';

const Teams = ({partnerMap, partners, ...rest}) => {
  return (
    <div style={{overflow: 'scroll', minHeight: '60px', height: '100%'}} >
      <div className="h5 mono leftBuffer" >
        Idle Teams
      </div>
      <div className="leftPad">
        <div className="grid">
          {partners.map(pair => {
            return (
              <div key={pair[0].handle} className="cell" style={{
                flexGrow: 0,
                minWidth: '0px',
              }}>
                <Team team={pair} partnerMap={partnerMap} partners={partners} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Teams;
