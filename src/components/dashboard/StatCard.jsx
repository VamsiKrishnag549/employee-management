

const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    type ="default"
}) => {
    return (
       <div className={`stat-card stat-card-${type}`}>

      <div className="stat-card-content">
        <p className="stat-card-title">
          {title}
        </p>

        <h2 className="stat-card-value">
          {value}
        </h2>

        {subtitle && (
          <p className="stat-card-subtitle">
            {subtitle}
          </p>
        )}
      </div>

      {icon && (
        <div className="stat-card-icon">
          {icon}
        </div>
      )}

    </div>
  ); 
};

export default StatCard;