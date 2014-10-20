var Component = require('omniscient');
var React = require('react/addons');
var Time = require('react-ago-component');
var { Link } = require('react-router');

require('./ArticleItem');

var mixins = [{
  onTouch() {
  }
}];

module.exports = Component('ArticleItem', mixins, function(cursor, statics) {
  var article = cursor.article;
  var classes = { 'article': true };

  return (
    <div
      className={React.addons.classSet(classes)}
      style={this.props && this.props.style}
      onClick={this.onTouch}>
      <h3>
        <Link to="article" params={{id: article.get('id')}}>
          {article.get('title')}
        </Link>
      </h3>
      <ul>
        <li className="score">{article.get('score')}</li>
        <li>{article.get('by')}</li>
        <li className="time">
          <Time date={new Date(article.get('time') * 1000)} autoUpdate />
        </li>
      </ul>
    </div>
  );

});