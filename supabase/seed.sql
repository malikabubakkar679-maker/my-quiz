-- Sample catalog for My Quiz. Applied by `supabase db reset` locally, or `supabase db push --include-seed`.
create or replace function pg_temp.seed_course(p jsonb) returns void language plpgsql as $$
declare
  v_course uuid;
  v_quiz uuid;
  q jsonb;
begin
  insert into public.courses (name, slug, description, icon, category, difficulty)
  values (p->>'name', p->>'slug', p->>'description', p->>'icon', p->>'category', (p->>'difficulty')::public.difficulty_level)
  on conflict (slug) do nothing returning id into v_course;
  if v_course is null then return; end if;
  insert into public.quizzes (course_id, title, description, difficulty, duration)
  values (v_course, p->>'quiz', p->>'quiz_description', (p->>'difficulty')::public.difficulty_level, 300)
  returning id into v_quiz;
  for q in select * from jsonb_array_elements(p->'questions') loop
    insert into public.questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty)
    values (v_quiz, q->>0, q->>1, q->>2, q->>3, q->>4, q->>5, q->>6, (p->>'difficulty')::public.difficulty_level);
  end loop;
end $$;

select pg_temp.seed_course($j${
  "name": "HTML", "slug": "html", "icon": "code", "category": "Web Development", "difficulty": "easy",
  "description": "Structure the web with semantic, accessible markup.",
  "quiz": "HTML Fundamentals", "quiz_description": "Elements, attributes and document structure.",
  "questions": [
    ["What does HTML stand for?", "Hyper Text Markup Language", "High Tech Modern Language", "Hyperlink and Text Management Language", "Home Tool Markup Language", "A", "HTML is the HyperText Markup Language."],
    ["Which element defines the largest heading?", "<head>", "<h6>", "<h1>", "<heading>", "C", "<h1> is the top-level heading."],
    ["Which attribute provides alternative text for an image?", "title", "alt", "src", "longdesc", "B", "alt describes the image for assistive tech."],
    ["Which element creates a hyperlink?", "<link>", "<href>", "<a>", "<nav>", "C", "The anchor element <a> creates links."],
    ["Which element is semantic for primary page content?", "<main>", "<div>", "<span>", "<section id=main>", "A", "<main> marks the dominant content."],
    ["Which input type is best for email addresses?", "text", "email", "mail", "address", "B", "type=email adds validation and mobile keyboards."],
    ["Where should the <title> element be placed?", "In <body>", "In <footer>", "In <head>", "Anywhere", "C", "<title> belongs in the document <head>."],
    ["Which element is used for an unordered list?", "<ol>", "<ul>", "<li>", "<list>", "B", "<ul> is an unordered list."],
    ["What is the correct HTML5 doctype?", "<!DOCTYPE html>", "<!DOCTYPE HTML5>", "<doctype html5>", "<!HTML>", "A", "HTML5 uses <!DOCTYPE html>."],
    ["Which element embeds another HTML page?", "<embed>", "<frame>", "<iframe>", "<object-page>", "C", "<iframe> embeds a nested browsing context."]
  ]}$j$::jsonb);

select pg_temp.seed_course($j${
  "name": "CSS", "slug": "css", "icon": "palette", "category": "Web Development", "difficulty": "easy",
  "description": "Style layouts, typography and responsive interfaces.",
  "quiz": "CSS Essentials", "quiz_description": "Selectors, the box model and layout.",
  "questions": [
    ["What does CSS stand for?", "Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Syntax", "B", "CSS means Cascading Style Sheets."],
    ["Which property changes text color?", "font-color", "text-color", "color", "foreground", "C", "color sets the text color."],
    ["Which selector targets an element with id 'nav'?", ".nav", "#nav", "nav", "*nav", "B", "# selects by id."],
    ["Which value makes an element a flex container?", "display: block", "display: flex", "position: flex", "flex: container", "B", "display:flex creates a flex container."],
    ["In the box model, which is between border and content?", "margin", "outline", "padding", "gap", "C", "Padding sits inside the border."],
    ["Which unit is relative to the root font size?", "em", "rem", "px", "vh", "B", "rem is relative to the root element."],
    ["Which property controls stacking order?", "z-index", "order", "stack", "layer", "A", "z-index controls stacking of positioned elements."],
    ["Which at-rule is used for responsive breakpoints?", "@import", "@media", "@font-face", "@supports", "B", "@media applies styles conditionally."],
    ["What does 'box-sizing: border-box' do?", "Adds a border", "Includes padding and border in width", "Removes margins", "Centers the box", "B", "Width then includes padding and border."],
    ["Which property creates grid columns?", "grid-columns", "grid-template-columns", "columns-grid", "grid-flow", "B", "grid-template-columns defines column tracks."]
  ]}$j$::jsonb);

select pg_temp.seed_course($j${
  "name": "JavaScript", "slug": "javascript", "icon": "braces", "category": "Programming", "difficulty": "medium",
  "description": "The language of the web: types, functions, async and the DOM.",
  "quiz": "JavaScript Basics", "quiz_description": "Core language concepts every developer needs.",
  "questions": [
    ["Which keyword declares a block-scoped constant?", "var", "let", "const", "static", "C", "const is block-scoped and cannot be reassigned."],
    ["What does typeof null return?", "'null'", "'object'", "'undefined'", "'number'", "B", "A long-standing quirk: typeof null is 'object'."],
    ["Which method adds an item to the end of an array?", "push()", "shift()", "unshift()", "concat()", "A", "push appends to the end."],
    ["What is the result of 2 + '2'?", "4", "'22'", "NaN", "TypeError", "B", "The number is coerced to a string."],
    ["Which operator checks value and type equality?", "==", "=", "===", "!=", "C", "=== is strict equality."],
    ["What does JSON.parse do?", "Converts object to string", "Converts JSON string to value", "Validates HTML", "Fetches JSON", "B", "It parses a JSON string."],
    ["Which is NOT a primitive type?", "string", "boolean", "object", "symbol", "C", "Objects are not primitives."],
    ["What does Array.prototype.map return?", "The same array", "A new array", "undefined", "A number", "B", "map returns a new transformed array."],
    ["Which keyword pauses an async function until a promise settles?", "yield", "await", "wait", "then", "B", "await pauses until the promise settles."],
    ["What is a closure?", "A syntax error", "A function with access to its outer scope", "A closed loop", "A class method", "B", "Closures capture variables from their lexical scope."]
  ]}$j$::jsonb);

select pg_temp.seed_course($j${
  "name": "Python", "slug": "python", "icon": "terminal", "category": "Programming", "difficulty": "medium",
  "description": "Readable, powerful programming for automation, data and the web.",
  "quiz": "Python Foundations", "quiz_description": "Syntax, data structures and built-ins.",
  "questions": [
    ["How do you start a comment in Python?", "//", "#", "/*", "--", "B", "# starts a single-line comment."],
    ["Which type is immutable?", "list", "dict", "tuple", "set", "C", "Tuples cannot be modified after creation."],
    ["What does len('quiz') return?", "3", "4", "5", "Error", "B", "The string has 4 characters."],
    ["Which keyword defines a function?", "func", "def", "function", "lambda", "B", "def defines a named function."],
    ["What is the output of 7 // 2?", "3.5", "3", "4", "2", "B", "// is floor division."],
    ["Which structure stores key-value pairs?", "list", "tuple", "dict", "set", "C", "dict maps keys to values."],
    ["How do you create a virtual environment?", "python -m venv env", "pip env create", "python --virtual", "venv new", "A", "python -m venv creates one."],
    ["What does range(3) produce?", "1, 2, 3", "0, 1, 2", "0, 1, 2, 3", "3", "B", "range starts at 0 and stops before 3."],
    ["Which keyword handles exceptions?", "catch", "except", "rescue", "handle", "B", "Python uses try/except."],
    ["What is a list comprehension?", "A way to document lists", "Concise syntax to build lists", "A sorting algorithm", "A type hint", "B", "e.g. [x*2 for x in items]."]
  ]}$j$::jsonb);

select pg_temp.seed_course($j${
  "name": "Mathematics", "slug": "mathematics", "icon": "sigma", "category": "Academics", "difficulty": "medium",
  "description": "Algebra, geometry and number sense challenges.",
  "quiz": "Math Mix", "quiz_description": "A blend of arithmetic, algebra and geometry.",
  "questions": [
    ["What is 12 x 12?", "124", "144", "132", "154", "B", "12 x 12 = 144."],
    ["Solve for x: 2x + 6 = 14", "3", "4", "5", "8", "B", "2x = 8 so x = 4."],
    ["What is the sum of angles in a triangle?", "90°", "180°", "270°", "360°", "B", "Interior angles sum to 180°."],
    ["What is the square root of 81?", "7", "8", "9", "10", "C", "9 x 9 = 81."],
    ["What is 15% of 200?", "15", "20", "30", "35", "C", "0.15 x 200 = 30."],
    ["Which number is prime?", "21", "27", "29", "33", "C", "29 has no divisors other than 1 and itself."],
    ["Area of a circle with radius r?", "2πr", "πr²", "πd", "r²", "B", "A = πr²."],
    ["What is 3³?", "9", "18", "27", "81", "C", "3 x 3 x 3 = 27."],
    ["What is the value of π to two decimals?", "3.12", "3.14", "3.16", "3.41", "B", "π ≈ 3.14159."],
    ["What is the slope of y = 3x + 2?", "2", "3", "5", "1/3", "B", "In y = mx + b, m is the slope."]
  ]}$j$::jsonb);

select pg_temp.seed_course($j${
  "name": "Science", "slug": "science", "icon": "flask-conical", "category": "Academics", "difficulty": "easy",
  "description": "Physics, chemistry and biology essentials.",
  "quiz": "Science Starter", "quiz_description": "Key facts across the natural sciences.",
  "questions": [
    ["What is the chemical symbol for water?", "H2O", "O2", "CO2", "HO", "A", "Two hydrogens and one oxygen."],
    ["Which planet is known as the Red Planet?", "Venus", "Mars", "Jupiter", "Mercury", "B", "Iron oxide gives Mars its color."],
    ["What gas do plants absorb for photosynthesis?", "Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen", "C", "Plants take in CO2."],
    ["What is the powerhouse of the cell?", "Nucleus", "Ribosome", "Mitochondria", "Golgi body", "C", "Mitochondria produce ATP."],
    ["What is the speed of light approximately?", "300,000 km/s", "30,000 km/s", "3,000 km/s", "3,000,000 km/s", "A", "About 299,792 km/s."],
    ["What force keeps us on the ground?", "Magnetism", "Friction", "Gravity", "Inertia", "C", "Gravity attracts masses."],
    ["What is the atomic number of carbon?", "4", "6", "8", "12", "B", "Carbon has 6 protons."],
    ["Which organ pumps blood?", "Lungs", "Liver", "Heart", "Kidney", "C", "The heart circulates blood."],
    ["What is the boiling point of water at sea level?", "90°C", "100°C", "110°C", "120°C", "B", "Water boils at 100°C at 1 atm."],
    ["What particle has a negative charge?", "Proton", "Neutron", "Electron", "Photon", "C", "Electrons are negatively charged."]
  ]}$j$::jsonb);

select pg_temp.seed_course($j${
  "name": "English", "slug": "english", "icon": "book-open", "category": "Languages", "difficulty": "easy",
  "description": "Grammar, vocabulary and comprehension.",
  "quiz": "English Grammar", "quiz_description": "Parts of speech, tenses and usage.",
  "questions": [
    ["Which word is a noun?", "Quickly", "Happiness", "Run", "Blue", "B", "Happiness names a thing (a feeling)."],
    ["Choose the correct form: She ___ to school every day.", "go", "goes", "going", "gone", "B", "Third person singular takes -es."],
    ["What is the plural of 'child'?", "Childs", "Childes", "Children", "Childrens", "C", "Child has an irregular plural."],
    ["Which is a synonym of 'rapid'?", "Slow", "Fast", "Calm", "Late", "B", "Rapid means fast."],
    ["Identify the adjective: 'The tall tree swayed.'", "tall", "tree", "swayed", "The", "A", "Tall describes the tree."],
    ["Which sentence is correct?", "Their going home.", "They're going home.", "There going home.", "Theyre going home.", "B", "They're = they are."],
    ["What is the past tense of 'write'?", "Writed", "Wrote", "Written", "Writes", "B", "Write → wrote → written."],
    ["Which is an antonym of 'ancient'?", "Old", "Modern", "Historic", "Aged", "B", "Modern is the opposite of ancient."],
    ["A word that joins clauses is a…", "Conjunction", "Preposition", "Pronoun", "Interjection", "A", "e.g. and, but, because."],
    ["Which punctuation ends a question?", ".", "!", "?", ";", "C", "Questions end with a question mark."]
  ]}$j$::jsonb);

select pg_temp.seed_course($j${
  "name": "General Knowledge", "slug": "general-knowledge", "icon": "globe", "category": "General", "difficulty": "medium",
  "description": "Geography, history, culture and the world around you.",
  "quiz": "World Trivia", "quiz_description": "Test your knowledge of the world.",
  "questions": [
    ["What is the capital of Japan?", "Osaka", "Kyoto", "Tokyo", "Seoul", "C", "Tokyo is Japan's capital."],
    ["Which is the largest ocean?", "Atlantic", "Indian", "Arctic", "Pacific", "D", "The Pacific is the largest."],
    ["How many continents are there?", "5", "6", "7", "8", "C", "Seven continents by the common model."],
    ["Who painted the Mona Lisa?", "Van Gogh", "Leonardo da Vinci", "Picasso", "Michelangelo", "B", "Painted by Leonardo da Vinci."],
    ["Which country hosts the Great Pyramid of Giza?", "Mexico", "Egypt", "Peru", "Sudan", "B", "It stands near Cairo, Egypt."],
    ["What is the longest river in the world?", "Amazon", "Nile", "Yangtze", "Mississippi", "B", "The Nile is usually cited as longest."],
    ["How many players are on a football (soccer) team on the field?", "9", "10", "11", "12", "C", "Eleven per side."],
    ["Which is the smallest country by area?", "Monaco", "Vatican City", "San Marino", "Malta", "B", "Vatican City is about 0.44 km²."],
    ["What currency is used in the United Kingdom?", "Euro", "Dollar", "Pound sterling", "Franc", "C", "The UK uses pound sterling."],
    ["Which is the tallest mountain above sea level?", "K2", "Kangchenjunga", "Mount Everest", "Lhotse", "C", "Everest is 8,849 m."]
  ]}$j$::jsonb);

select pg_temp.seed_course($j${
  "name": "Computer Science", "slug": "computer-science", "icon": "cpu", "category": "Programming", "difficulty": "hard",
  "description": "Algorithms, data structures and how computers work.",
  "quiz": "CS Core Concepts", "quiz_description": "Complexity, data structures and systems.",
  "questions": [
    ["What is the time complexity of binary search?", "O(n)", "O(log n)", "O(n log n)", "O(1)", "B", "It halves the search space each step."],
    ["Which data structure is LIFO?", "Queue", "Stack", "Heap", "Tree", "B", "Last in, first out."],
    ["What does CPU stand for?", "Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Utility", "A", "The CPU executes instructions."],
    ["How many bits are in a byte?", "4", "8", "16", "32", "B", "A byte is 8 bits."],
    ["Which sorting algorithm has average O(n log n)?", "Bubble sort", "Insertion sort", "Merge sort", "Selection sort", "C", "Merge sort is O(n log n)."],
    ["What does SQL stand for?", "Structured Query Language", "Simple Query Language", "Sequential Query Logic", "Standard Question Language", "A", "Used for relational databases."],
    ["Which structure uses key hashing for O(1) average lookup?", "Linked list", "Hash table", "Binary tree", "Array", "B", "Hash tables map keys to buckets."],
    ["What is the binary representation of 5?", "100", "101", "110", "111", "B", "4 + 1 = 101."],
    ["Which protocol secures web traffic?", "HTTP", "FTP", "HTTPS", "SMTP", "C", "HTTPS uses TLS."],
    ["What does RAM stand for?", "Read Access Memory", "Random Access Memory", "Rapid Action Memory", "Runtime Allocation Memory", "B", "Volatile working memory."]
  ]}$j$::jsonb);
