
type TextProps = {
  title: string;
  description: string;
  dangerously: boolean;
};

/**
 * Renders an article component with a title and description.
 *
 * @param {Object} props - The properties object for the component.
 * @param {string} props.title - The title of the article to display.
 * @param {string} props.description - The description of the article.
 * @param {boolean} props.dangerously - A flag to determine whether the description is rendered using `dangerouslySetInnerHTML`.
 *                                      I am using this flag to render HTML content from the segment static content description.
 * @return {JSX.Element} A JSX element representing the article.
 */
function Article({ title, description, dangerously }: TextProps) {

  return (
    <div>
      <h1 className={"headline-2"}>{title}</h1>

      {dangerously && (
        <div dangerouslySetInnerHTML={{ __html: description }} />
      )}

      {!dangerously && (
        <p>{description}</p>
      )}

    </div>
  );
}

export default Article;
