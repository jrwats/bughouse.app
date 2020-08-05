import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Team from './Team.react';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles((theme) => {
  console.log(theme);
  return {
    root: {
      flexGrow: 1,
      padding: '20px 100px 20px 100px',
      bottom: '40px',
    },
  };
});

const Teams = ({partnerMap, partners, ...rest}) => {
  const classes = useStyles();

  return (
    <div style={{overflow: 'scroll', minHeight: '60px', height: '100%'}} >
      <div className="h5 mono leftBuffer" >
        Idle Teams
      </div>
      <div className="leftPad">
        <div className="grid">
          {partners.map(pair => {
            return (
              <div className="cell" style={{
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
